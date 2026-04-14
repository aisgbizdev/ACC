import { eq, isNull, and } from "drizzle-orm";
import { db, ptsTable, dailyActivitiesTable, findingsTable } from "@workspace/db";
import { logger } from "./logger";
import { notifyDailyMissing, notifyDailySummary, notifyApupptReminder, notifyDuApprovalReminder } from "./push-notify";
import { computeTrafficLight, isWeekend } from "./traffic-light";

function getDatePartsInJakarta(input = new Date()): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(input);
  const value = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return { y: value("year"), m: value("month"), d: value("day") };
}

function getTodayInJakarta(): string {
  const { y, m, d } = getDatePartsInJakarta();
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function getTomorrowInJakarta(): string {
  const { y, m, d } = getDatePartsInJakarta();
  const local = new Date(Date.UTC(y, m - 1, d + 1));
  const yy = local.getUTCFullYear();
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(local.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export async function runDuApprovalReminderHMinusOne(): Promise<void> {
  logger.info("Running DU approval reminder check (H-1 12:00 WIB)...");

  try {
    const tomorrowJakarta = getTomorrowInJakarta();
    const dueAtUtc = new Date(`${tomorrowJakarta}T05:00:00.000Z`);

    const pending = await db
      .select({ ptId: dailyActivitiesTable.ptId })
      .from(dailyActivitiesTable)
      .where(
        and(
          eq(dailyActivitiesTable.uploadDeadlineAt, dueAtUtc),
          isNull(dailyActivitiesTable.duSignedOffAt),
        ),
      );

    if (pending.length === 0) {
      logger.info("No DU reminders required for H-1 window");
      return;
    }

    const ptIds = [...new Set(pending.map((p) => p.ptId))];
    const pts = await db.select().from(ptsTable);
    const byId = new Map(pts.map((pt) => [pt.id, pt] as const));

    for (const ptId of ptIds) {
      const pt = byId.get(ptId);
      if (!pt) continue;
      notifyDuApprovalReminder(ptId, pt.name, tomorrowJakarta).catch(() => {});
    }

    logger.info({ affectedPts: ptIds.length }, "DU approval reminder check complete");
  } catch (err) {
    logger.error({ err }, "DU approval reminder check failed");
  }
}

export async function runApupptReminders(): Promise<void> {
  const today = getTodayInJakarta();

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
  const today = getTodayInJakarta();

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
  scheduleAt(5, runDuApprovalReminderHMinusOne, "DU approval reminder H-1 (12:00 WIB)");
  scheduleAt(10, runDailyNotifications, "Daily notification (17:00 WIB)");
}
