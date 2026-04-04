import { eq, isNull, and } from "drizzle-orm";
import { db, ptsTable, dailyActivitiesTable, findingsTable } from "@workspace/db";
import { logger } from "./logger";
import { notifyDailyMissing, notifyDailySummary } from "./push-notify";
import { computeTrafficLight } from "./traffic-light";

export async function runDailyNotifications(): Promise<void> {
  const today = new Date().toISOString().split("T")[0]!;

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

export function scheduleDailyNotifications(): void {
  const scheduleNext = () => {
    const now = new Date();
    const next = new Date(now);
    // 17:00 WIB = 10:00 UTC
    next.setUTCHours(10, 0, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    const msUntil = next.getTime() - now.getTime();
    setTimeout(() => {
      runDailyNotifications();
      setInterval(runDailyNotifications, 24 * 60 * 60 * 1000);
    }, msUntil);
    logger.info({ nextRun: next.toISOString() }, "Daily notification cron scheduled");
  };

  scheduleNext();
}
