import { Router, type IRouter } from "express";
import { eq, desc, isNull, isNotNull, gte, sql } from "drizzle-orm";
import { db, ptsTable, dailyActivitiesTable, findingsTable, branchesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { computeTrafficLight } from "../lib/traffic-light";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  const today = new Date().toISOString().split("T")[0];

  let pts = await db.select().from(ptsTable).orderBy(ptsTable.code);

  if (user.ptId) {
    pts = pts.filter((p) => p.id === user.ptId);
  }

  const ptStatuses = await Promise.all(
    pts.map(async (pt) => {
      const [lastActivity] = await db
        .select()
        .from(dailyActivitiesTable)
        .where(eq(dailyActivitiesTable.ptId, pt.id))
        .orderBy(desc(dailyActivitiesTable.date))
        .limit(1);

      const openFindings = await db
        .select()
        .from(findingsTable)
        .where(eq(findingsTable.ptId, pt.id));

      const openCount = openFindings.filter((f) => f.status !== "completed").length;
      const overdueCount = openFindings.filter((f) => {
        if (f.status === "completed") return false;
        const daysDiff = Math.floor(
          (new Date(today).getTime() - new Date(f.date).getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysDiff > 3;
      }).length;

      const status = computeTrafficLight(lastActivity?.date ?? null, openFindings, today);

      return {
        id: pt.id,
        code: pt.code,
        name: pt.name,
        status,
        lastActivityDate: lastActivity?.date ?? null,
        openFindingsCount: openCount,
        overdueCount,
      };
    })
  );

  const greenCount = ptStatuses.filter((p) => p.status === "green").length;
  const yellowCount = ptStatuses.filter((p) => p.status === "yellow").length;
  const redCount = ptStatuses.filter((p) => p.status === "red").length;

  res.json({
    totalPts: pts.length,
    greenCount,
    yellowCount,
    redCount,
    ptStatuses,
  });
});

router.get("/dashboard/kpi", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  if (!["dk", "du", "owner", "superadmin"].includes(user.role)) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.slice(0, 7);
  const firstOfMonth = `${thisMonth}-01`;

  const allActivities = await db
    .select()
    .from(dailyActivitiesTable)
    .orderBy(desc(dailyActivitiesTable.date));

  const monthActivities = allActivities.filter(a => a.date >= firstOfMonth);
  const todayActivities = allActivities.filter(a => a.date === today);

  const total = allActivities.length;
  const totalMonth = monthActivities.length;
  const totalToday = todayActivities.length;
  const pendingReview = allActivities.filter(a => !a.dkReviewedAt).length;
  const reviewed = allActivities.filter(a => a.dkReviewedAt && !a.duSignedOffAt).length;
  const signedOff = allActivities.filter(a => !!a.duSignedOffAt).length;
  const reviewRate = total > 0 ? Math.round(((reviewed + signedOff) / total) * 100) : 0;
  const signOffRate = total > 0 ? Math.round((signedOff / total) * 100) : 0;
  const totalItemsReviewed = allActivities.reduce((sum, a) => sum + (a.itemsReviewed ?? 0), 0);
  const monthItemsReviewed = monthActivities.reduce((sum, a) => sum + (a.itemsReviewed ?? 0), 0);

  const activityTypeBreakdown: Record<string, number> = {};
  for (const a of allActivities) {
    activityTypeBreakdown[a.activityType] = (activityTypeBreakdown[a.activityType] ?? 0) + 1;
  }

  const pts = await db.select().from(ptsTable).orderBy(ptsTable.code);

  const byPt = await Promise.all(pts.map(async (pt) => {
    const ptActs = allActivities.filter(a => a.ptId === pt.id);
    const ptMonthActs = ptActs.filter(a => a.date >= firstOfMonth);
    const ptReviewed = ptActs.filter(a => !!a.dkReviewedAt).length;
    const ptSignedOff = ptActs.filter(a => !!a.duSignedOffAt).length;
    const ptTotal = ptActs.length;
    const ptItems = ptActs.reduce((sum, a) => sum + (a.itemsReviewed ?? 0), 0);

    const branches = await db
      .select()
      .from(branchesTable)
      .where(eq(branchesTable.ptId, pt.id));

    const byBranch = branches.map(br => {
      const brActs = ptActs.filter(a => a.branchId === br.id);
      return {
        branchId: br.id,
        branchName: br.name,
        totalActivities: brActs.length,
        totalItemsReviewed: brActs.reduce((sum, a) => sum + (a.itemsReviewed ?? 0), 0),
        reviewedCount: brActs.filter(a => !!a.dkReviewedAt).length,
      };
    });

    const nullBranchActs = ptActs.filter(a => !a.branchId);
    if (nullBranchActs.length > 0) {
      byBranch.push({
        branchId: "kantor_pusat",
        branchName: "Kantor Pusat",
        totalActivities: nullBranchActs.length,
        totalItemsReviewed: nullBranchActs.reduce((sum, a) => sum + (a.itemsReviewed ?? 0), 0),
        reviewedCount: nullBranchActs.filter(a => !!a.dkReviewedAt).length,
      });
    }

    const typeBreakdown: Record<string, number> = {};
    for (const a of ptActs) {
      typeBreakdown[a.activityType] = (typeBreakdown[a.activityType] ?? 0) + 1;
    }

    return {
      ptId: pt.id,
      ptCode: pt.code,
      ptName: pt.name,
      totalActivities: ptTotal,
      totalActivitiesThisMonth: ptMonthActs.length,
      reviewedCount: ptReviewed,
      signedOffCount: ptSignedOff,
      pendingReviewCount: ptTotal - ptReviewed,
      reviewRate: ptTotal > 0 ? Math.round((ptReviewed / ptTotal) * 100) : 0,
      signOffRate: ptTotal > 0 ? Math.round((ptSignedOff / ptTotal) * 100) : 0,
      totalItemsReviewed: ptItems,
      activityTypeBreakdown: typeBreakdown,
      byBranch,
    };
  }));

  res.json({
    total,
    totalThisMonth: totalMonth,
    totalToday,
    pendingReviewCount: pendingReview,
    reviewedCount: reviewed,
    signedOffCount: signedOff,
    reviewRate,
    signOffRate,
    totalItemsReviewed,
    monthItemsReviewed,
    activityTypeBreakdown,
    byPt,
  });
});

export default router;
