import { eq, isNull, and } from "drizzle-orm";
import { db, ptsTable, dailyActivitiesTable, findingsTable } from "@workspace/db";
import { logger } from "./logger";
import { notifyDailyMissing, notifyDailySummary, notifyApupptReminder } from "./push-notify";
import { computeTrafficLight, isWeekend } from "./traffic-light";

export async function runApupptReminders(): Promise<void> {
  const today = new Date().toISOString().split("T")[0]!;

  if (isWeekend(today)) {
    logger.info("Skipping APUPPT reminders — weekend");
    return;
  }

  logger.info("Running APUPPT morning reminder check...");

  try {
    const pts = await db.select().from(ptsTable);

    for (const pt of pts) {
      const activities = await db
        .select()
        .from(dailyActivitiesTable)
        .where(and(eq(dailyActivitiesTable.ptId, pt.id), eq(dailyActivitiesTable.date, today)));

      if (activities.length === 0) {
        notifyApupptReminder(pt.id, pt.name).catch(() => {});
      }
    }

    logger.info("APUPPT morning reminder check complete");
  } catch (err) {
    logger.error({ err }, "APUPPT reminder check failed");
  }
}

export async function runDailyNotifications(): Promise<void> {
  const today = new Date().toISOString().split("T")[0]!;

  if (isWeekend(today)) {
    logger.info("Skipping daily notifications — weekend");
    return;
  }

  logger.info("Running daily notification check...");

  try {
    const pts = await db.select().from(ptsTable);

    let redCount = 0;
    let greenCount = 0;

    for (const pt of pts) {
      const activities = await db
        .select()
        .from(dailyActivitiesTable)
        .where(and(eq(dailyActivitiesTable.ptId, pt.id), eq(dailyActivitiesTable.date, today)));

      const findings = await db
        .select()
        .from(findingsTable)
        .where(and(eq(findingsTable.ptId, pt.id), isNull(findingsTable.closedAt)));

      const lastActivityDate = activities.length > 0 ? today : null;
      const status = computeTrafficLight(lastActivityDate, findings, today);

      if (status === "red") {
        redCount++;
        notifyDailyMissing(pt.id, pt.name).catch(() => {});
      } else if (status === "green") {
        greenCount++;
      }
    }

    notifyDailySummary({ totalPts: pts.length, redCount, greenCount }).catch(() => {});

    logger.info({ totalPts: pts.length, redCount, greenCount }, "Daily notification check complete");
  } catch (err) {
    logger.error({ err }, "Daily notification check failed");
  }
}

function scheduleAt(utcHour: number, fn: () => void, label: string): void {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(utcHour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const msUntil = next.getTime() - now.getTime();
  setTimeout(() => {
    fn();
    setInterval(fn, 24 * 60 * 60 * 1000);
  }, msUntil);
  logger.info({ nextRun: next.toISOString() }, `${label} cron scheduled`);
}

export function scheduleDailyNotifications(): void {
  scheduleAt(2, runApupptReminders, "APUPPT morning reminder (09:00 WIB)");
  scheduleAt(10, runDailyNotifications, "Daily notification (17:00 WIB)");
}
