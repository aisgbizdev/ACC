import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, ptsTable, dailyActivitiesTable, findingsTable, branchesTable } from "@workspace/db";
import { requireRole } from "../middlewares/auth";
import { computeTrafficLight } from "../lib/traffic-light";

const router: IRouter = Router();

router.get("/reports/summary", requireRole("dk", "du", "owner"), async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const pts = await db.select().from(ptsTable).orderBy(ptsTable.code);

  const summaries = await Promise.all(
    pts.map(async (pt) => {
      const activities = await db
        .select()
        .from(dailyActivitiesTable)
        .where(eq(dailyActivitiesTable.ptId, pt.id));

      const findings = await db
        .select()
        .from(findingsTable)
        .where(eq(findingsTable.ptId, pt.id));

      const [lastActivity] = await db
        .select()
        .from(dailyActivitiesTable)
        .where(eq(dailyActivitiesTable.ptId, pt.id))
        .orderBy(desc(dailyActivitiesTable.date))
        .limit(1);

      const openFindings = findings.filter((f) => f.status !== "completed");
      const completedFindings = findings.filter((f) => f.status === "completed");
      const status = computeTrafficLight(lastActivity?.date ?? null, findings, today);

      const reviewedCount = activities.filter((a) => !!a.dkReviewedAt).length;
      const signedOffCount = activities.filter((a) => !!a.duSignedOffAt).length;
      const pendingReviewCount = activities.filter((a) => !a.dkReviewedAt).length;
      const totalItemsReviewed = activities.reduce((sum, a) => sum + (a.itemsReviewed ?? 0), 0);
      const reviewRate = activities.length > 0 ? Math.round((reviewedCount / activities.length) * 100) : 0;
      const signOffRate = activities.length > 0 ? Math.round((signedOffCount / activities.length) * 100) : 0;

      const activityTypeBreakdown: Record<string, number> = {};
      for (const a of activities) {
        activityTypeBreakdown[a.activityType] = (activityTypeBreakdown[a.activityType] ?? 0) + 1;
      }

      const thisMonth = today.slice(0, 7);
      const monthActivities = activities.filter(a => a.date >= `${thisMonth}-01`);

      return {
        ptId: pt.id,
        ptCode: pt.code,
        ptName: pt.name,
        totalActivities: activities.length,
        totalActivitiesThisMonth: monthActivities.length,
        totalFindings: findings.length,
        openFindings: openFindings.length,
        completedFindings: completedFindings.length,
        reviewedCount,
        signedOffCount,
        pendingReviewCount,
        totalItemsReviewed,
        reviewRate,
        signOffRate,
        activityTypeBreakdown,
        status,
        lastActivityDate: lastActivity?.date ?? null,
      };
    })
  );

  res.json(summaries);
});

export default router;
