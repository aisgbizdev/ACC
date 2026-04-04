import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, SQL } from "drizzle-orm";
import { db, ptsTable, dailyActivitiesTable, findingsTable, activityReviewsTable, reportSignoffsTable, usersTable } from "@workspace/db";
import { requireRole, requireAuth } from "../middlewares/auth";
import { computeTrafficLight } from "../lib/traffic-light";

const router: IRouter = Router();

router.get("/reports/summary", requireRole("dk", "du", "owner", "superadmin"), async (req, res): Promise<void> => {
  const user = req.session.user!;
  const today = new Date().toISOString().split("T")[0];

  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const ptIdFilter = req.query.ptId as string | undefined;

  let pts = await db.select().from(ptsTable).orderBy(ptsTable.code);

  // DU with ptId can only see their PT
  if (user.ptId) {
    pts = pts.filter((p) => p.id === user.ptId);
  } else if (ptIdFilter) {
    pts = pts.filter((p) => p.id === ptIdFilter);
  }

  const summaries = await Promise.all(
    pts.map(async (pt) => {
      const actConditions: SQL[] = [eq(dailyActivitiesTable.ptId, pt.id)];
      if (startDate) actConditions.push(gte(dailyActivitiesTable.date, startDate));
      if (endDate) actConditions.push(lte(dailyActivitiesTable.date, endDate));

      const activities = await db
        .select()
        .from(dailyActivitiesTable)
        .where(and(...actConditions));

      const fConditions: SQL[] = [eq(findingsTable.ptId, pt.id)];
      if (startDate) fConditions.push(gte(findingsTable.date, startDate));
      if (endDate) fConditions.push(lte(findingsTable.date, endDate));

      const findings = await db
        .select()
        .from(findingsTable)
        .where(and(...fConditions));

      const [lastActivity] = await db
        .select()
        .from(dailyActivitiesTable)
        .where(eq(dailyActivitiesTable.ptId, pt.id))
        .orderBy(desc(dailyActivitiesTable.date))
        .limit(1);

      const openFindings = findings.filter((f) => f.status !== "completed");
      const completedFindings = findings.filter((f) => f.status === "completed");
      const status = computeTrafficLight(lastActivity?.date ?? null, findings, today);

      // DK review coverage for this week
      let dkReviewPct = 0;
      if (activities.length > 0) {
        const activityIds = activities.map((a) => a.id);
        let reviewedCount = 0;
        for (const actId of activityIds) {
          const [rev] = await db.select({ id: activityReviewsTable.id }).from(activityReviewsTable).where(eq(activityReviewsTable.activityId, actId));
          if (rev) reviewedCount++;
        }
        dkReviewPct = Math.round((reviewedCount / activities.length) * 100);
      }

      // Activity breakdown by type
      const activityBreakdown: Record<string, number> = {};
      for (const a of activities) {
        activityBreakdown[a.activityType] = (activityBreakdown[a.activityType] ?? 0) + 1;
      }

      const totalItemsReviewed = activities.reduce((sum, a) => sum + (a.itemsReviewed ?? 0), 0);

      // DU sign-off status
      let duSignoff = null;
      if (startDate && endDate) {
        const periodType = req.query.periodType as string | undefined;
        if (periodType === "weekly" || periodType === "monthly") {
          const [so] = await db
            .select({
              signedOffAt: reportSignoffsTable.signedOffAt,
              signerName: usersTable.name,
            })
            .from(reportSignoffsTable)
            .leftJoin(usersTable, eq(reportSignoffsTable.signedOffBy, usersTable.id))
            .where(
              and(
                eq(reportSignoffsTable.ptId, pt.id),
                eq(reportSignoffsTable.periodType, periodType as "weekly" | "monthly"),
                eq(reportSignoffsTable.periodStart, startDate),
                eq(reportSignoffsTable.periodEnd, endDate)
              )
            );
          duSignoff = so ?? null;
        }
      }

      return {
        ptId: pt.id,
        ptCode: pt.code,
        ptName: pt.name,
        totalActivities: activities.length,
        totalItemsReviewed,
        totalFindings: findings.length,
        openFindings: openFindings.length,
        completedFindings: completedFindings.length,
        activityBreakdown,
        dkReviewPct,
        duSignoff,
        status,
        lastActivityDate: lastActivity?.date ?? null,
      };
    })
  );

  // Group summary
  const mostStable = summaries.filter((s) => s.status === "green").sort((a, b) => b.dkReviewPct - a.dkReviewPct)[0] ?? null;
  const mostFindings = summaries.slice().sort((a, b) => b.totalFindings - a.totalFindings)[0] ?? null;
  const leastActive = summaries.slice().sort((a, b) => a.totalActivities - b.totalActivities)[0] ?? null;

  res.json({
    summaries,
    groupInsights: {
      mostStable: mostStable ? { ptCode: mostStable.ptCode, ptName: mostStable.ptName } : null,
      mostFindings: mostFindings ? { ptCode: mostFindings.ptCode, ptName: mostFindings.ptName, count: mostFindings.totalFindings } : null,
      leastActive: leastActive ? { ptCode: leastActive.ptCode, ptName: leastActive.ptName, count: leastActive.totalActivities } : null,
    },
  });
});

export default router;
