import { Router, type IRouter } from "express";
import { eq, and, gte, lte, SQL, isNotNull } from "drizzle-orm";
import { db, ptsTable, dailyActivitiesTable, findingsTable, branchesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

const PeriodQuerySchema = z.object({
  ptId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function getDefaultPeriod() {
  const now = new Date();
  const startDate = `${now.toISOString().slice(0, 7)}-01`;
  const endDate = now.toISOString().split("T")[0];
  return { startDate, endDate };
}

function computeKpiScore(metrics: {
  updateRate: number;
  findingsResolved: number;
  findingsCreated: number;
  avgResolutionDays: number | null;
}): number {
  const { updateRate, findingsResolved, findingsCreated, avgResolutionDays } = metrics;

  let score = 0;

  score += updateRate * 0.4;

  const resolveRate = findingsCreated > 0 ? (findingsResolved / findingsCreated) * 100 : 100;
  score += resolveRate * 0.35;

  if (avgResolutionDays === null || avgResolutionDays <= 3) {
    score += 25;
  } else if (avgResolutionDays <= 7) {
    score += 15;
  } else if (avgResolutionDays <= 14) {
    score += 8;
  }

  return Math.min(100, Math.round(score));
}

function getWorkingDays(startDate: string, endDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

router.get("/kpi/apuppt", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;

  if (!["apuppt", "dk", "du", "owner", "superadmin"].includes(user.role)) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  const parsed = PeriodQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Parameter tidak valid." });
    return;
  }

  const defaults = getDefaultPeriod();
  const startDate = parsed.data.startDate ?? defaults.startDate;
  const endDate = parsed.data.endDate ?? defaults.endDate;

  let effectivePtId: string | undefined = parsed.data.ptId;
  if (user.ptId) {
    effectivePtId = user.ptId;
  }

  const apupptWhere: SQL[] = [eq(usersTable.role, "apuppt")];
  if (effectivePtId) {
    apupptWhere.push(eq(usersTable.ptId, effectivePtId));
  }

  let apupptUsers = await db
    .select({ id: usersTable.id, name: usersTable.name, ptId: usersTable.ptId })
    .from(usersTable)
    .where(and(...apupptWhere));

  if (user.role === "apuppt") {
    apupptUsers = apupptUsers.filter(u => u.id === user.id);
  }

  const pts = await db.select().from(ptsTable);
  const ptMap = new Map(pts.map(p => [p.id, p]));

  const allActivities = await db
    .select()
    .from(dailyActivitiesTable)
    .where(
      and(
        gte(dailyActivitiesTable.date, startDate),
        lte(dailyActivitiesTable.date, endDate),
        ...(effectivePtId ? [eq(dailyActivitiesTable.ptId, effectivePtId)] : [])
      )
    );

  const allFindings = await db
    .select()
    .from(findingsTable)
    .where(
      and(
        gte(findingsTable.date, startDate),
        lte(findingsTable.date, endDate),
        ...(effectivePtId ? [eq(findingsTable.ptId, effectivePtId)] : [])
      )
    );

  const workingDays = getWorkingDays(startDate, endDate);

  const results = apupptUsers.map(u => {
    const userActivities = allActivities.filter(a => a.userId === u.id);
    const userFindings = allFindings.filter(f => f.reportedBy === u.id);

    const uniqueDays = new Set(userActivities.map(a => a.date)).size;
    const updateRate = workingDays > 0 ? Math.min(100, Math.round((uniqueDays / workingDays) * 100)) : 0;

    const totalCustomersChecked = userActivities.reduce((sum, a) => sum + (a.itemsReviewed ?? 0), 0);

    const activityTypeBreakdown: Record<string, number> = {};
    for (const a of userActivities) {
      activityTypeBreakdown[a.activityType] = (activityTypeBreakdown[a.activityType] ?? 0) + 1;
    }

    const findingsCreated = userFindings.length;
    const findingsResolved = userFindings.filter(f => f.status === "completed").length;
    const findingsOpen = userFindings.filter(f => f.status !== "completed").length;

    let totalResolutionDays = 0;
    let resolvedWithDates = 0;
    for (const f of userFindings) {
      if (f.status === "completed" && f.closedAt) {
        const created = new Date(f.date + "T00:00:00").getTime();
        const closed = new Date(f.closedAt).getTime();
        const days = (closed - created) / (1000 * 60 * 60 * 24);
        totalResolutionDays += days;
        resolvedWithDates++;
      }
    }

    const avgResolutionDays = resolvedWithDates > 0
      ? Math.round((totalResolutionDays / resolvedWithDates) * 10) / 10
      : null;

    const kpiScore = computeKpiScore({ updateRate, findingsResolved, findingsCreated, avgResolutionDays });

    const pt = u.ptId ? ptMap.get(u.ptId) : null;

    return {
      userId: u.id,
      userName: u.name,
      ptId: u.ptId,
      ptCode: pt?.code ?? null,
      ptName: pt?.name ?? null,
      updateRate,
      totalCustomersChecked,
      activityTypeBreakdown,
      findingsCreated,
      findingsResolved,
      findingsOpen,
      avgResolutionDays,
      kpiScore,
    };
  });

  results.sort((a, b) => b.kpiScore - a.kpiScore);

  const ranked = results.map((r, i) => ({ ...r, rank: i + 1 }));

  res.json({ startDate, endDate, workingDays, apuppt: ranked });
});

router.get("/kpi/dk", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;

  if (!["dk", "du", "owner", "superadmin"].includes(user.role)) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  const parsed = PeriodQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Parameter tidak valid." });
    return;
  }

  const defaults = getDefaultPeriod();
  const startDate = parsed.data.startDate ?? defaults.startDate;
  const endDate = parsed.data.endDate ?? defaults.endDate;

  let effectivePtId: string | undefined = parsed.data.ptId;
  if (user.ptId) {
    effectivePtId = user.ptId;
  }

  const dkWhere: SQL[] = [eq(usersTable.role, "dk")];
  if (effectivePtId) {
    dkWhere.push(eq(usersTable.ptId, effectivePtId));
  }

  const dkUsers = await db
    .select({ id: usersTable.id, name: usersTable.name, ptId: usersTable.ptId })
    .from(usersTable)
    .where(and(...dkWhere));

  const pts = await db.select().from(ptsTable);
  const ptMap = new Map(pts.map(p => [p.id, p]));

  const activitiesConds: SQL[] = [
    gte(dailyActivitiesTable.date, startDate),
    lte(dailyActivitiesTable.date, endDate),
    isNotNull(dailyActivitiesTable.dkReviewedAt),
  ];
  if (effectivePtId) {
    activitiesConds.push(eq(dailyActivitiesTable.ptId, effectivePtId));
  }

  const reviewedActivities = await db
    .select()
    .from(dailyActivitiesTable)
    .where(and(...activitiesConds));

  const allActivitiesConds: SQL[] = [
    gte(dailyActivitiesTable.date, startDate),
    lte(dailyActivitiesTable.date, endDate),
  ];
  if (effectivePtId) {
    allActivitiesConds.push(eq(dailyActivitiesTable.ptId, effectivePtId));
  }

  const allActivities = await db
    .select()
    .from(dailyActivitiesTable)
    .where(and(...allActivitiesConds));

  const findingsConds: SQL[] = [
    gte(findingsTable.date, startDate),
    lte(findingsTable.date, endDate),
    isNotNull(findingsTable.dkAcknowledgedAt),
  ];
  if (effectivePtId) {
    findingsConds.push(eq(findingsTable.ptId, effectivePtId));
  }

  const acknowledgedFindings = await db
    .select()
    .from(findingsTable)
    .where(and(...findingsConds));

  const results = dkUsers.map(dk => {
    const dkReviewed = reviewedActivities.filter(a => a.dkReviewedBy === dk.id);

    let totalReviewTimeHours = 0;
    let countWithTime = 0;
    for (const a of dkReviewed) {
      if (a.createdAt && a.dkReviewedAt) {
        const created = new Date(a.createdAt).getTime();
        const reviewed = new Date(a.dkReviewedAt).getTime();
        const hours = (reviewed - created) / (1000 * 60 * 60);
        totalReviewTimeHours += hours;
        countWithTime++;
      }
    }

    const avgReviewTimeHours = countWithTime > 0
      ? Math.round((totalReviewTimeHours / countWithTime) * 10) / 10
      : null;

    const dkAcknowledgedFindings = acknowledgedFindings.filter(f => f.dkAcknowledgedBy === dk.id);

    let ticketsRespondedWithin24h = 0;
    for (const f of dkAcknowledgedFindings) {
      if (f.createdAt && f.dkAcknowledgedAt) {
        const created = new Date(f.createdAt).getTime();
        const acked = new Date(f.dkAcknowledgedAt).getTime();
        const hours = (acked - created) / (1000 * 60 * 60);
        if (hours <= 24) ticketsRespondedWithin24h++;
      }
    }

    const totalActivitiesInScope = effectivePtId
      ? allActivities.filter(a => a.ptId === (effectivePtId ?? "")).length
      : allActivities.length;

    const reviewRate = totalActivitiesInScope > 0
      ? Math.min(100, Math.round((dkReviewed.length / totalActivitiesInScope) * 100))
      : 0;

    const totalTicketComments = dkAcknowledgedFindings.length;
    const ticketsRespondedRate = dkAcknowledgedFindings.length > 0
      ? Math.round((ticketsRespondedWithin24h / dkAcknowledgedFindings.length) * 100)
      : 0;

    const pt = dk.ptId ? ptMap.get(dk.ptId) : null;

    return {
      userId: dk.id,
      userName: dk.name,
      ptId: dk.ptId,
      ptCode: pt?.code ?? null,
      ptName: pt?.name ?? null,
      reviewRate,
      avgReviewTimeHours,
      totalTicketComments,
      ticketsRespondedWithin24h,
      ticketsRespondedRate,
      totalReviewed: dkReviewed.length,
    };
  });

  res.json({ startDate, endDate, dk: results });
});

router.get("/kpi/du", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;

  if (!["du", "dk", "owner", "superadmin"].includes(user.role)) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  const parsed = PeriodQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Parameter tidak valid." });
    return;
  }

  const defaults = getDefaultPeriod();
  const startDate = parsed.data.startDate ?? defaults.startDate;
  const endDate = parsed.data.endDate ?? defaults.endDate;

  let effectivePtId: string | undefined = parsed.data.ptId;
  if (user.ptId) {
    effectivePtId = user.ptId;
  }

  const duWhere: SQL[] = [eq(usersTable.role, "du")];
  if (effectivePtId) {
    duWhere.push(eq(usersTable.ptId, effectivePtId));
  }

  const duUsers = await db
    .select({ id: usersTable.id, name: usersTable.name, ptId: usersTable.ptId })
    .from(usersTable)
    .where(and(...duWhere));

  const pts = await db.select().from(ptsTable);
  const ptMap = new Map(pts.map(p => [p.id, p]));

  const allActivitiesConds: SQL[] = [
    gte(dailyActivitiesTable.date, startDate),
    lte(dailyActivitiesTable.date, endDate),
    isNotNull(dailyActivitiesTable.dkReviewedAt),
  ];
  if (effectivePtId) {
    allActivitiesConds.push(eq(dailyActivitiesTable.ptId, effectivePtId));
  }

  const reviewedActivities = await db
    .select()
    .from(dailyActivitiesTable)
    .where(and(...allActivitiesConds));

  const results = duUsers.map(du => {
    const duSignedOff = reviewedActivities.filter(a => a.duSignedOffBy === du.id);
    const totalEligible = effectivePtId
      ? reviewedActivities.filter(a => a.ptId === effectivePtId).length
      : reviewedActivities.length;

    const signOffRate = totalEligible > 0
      ? Math.min(100, Math.round((duSignedOff.length / totalEligible) * 100))
      : 0;

    const pt = du.ptId ? ptMap.get(du.ptId) : null;

    return {
      userId: du.id,
      userName: du.name,
      ptId: du.ptId,
      ptCode: pt?.code ?? null,
      ptName: pt?.name ?? null,
      signOffRate,
      totalSignedOff: duSignedOff.length,
      totalEligible,
    };
  });

  res.json({ startDate, endDate, du: results });
});

router.get("/branches/analytics", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;

  if (!["dk", "du", "owner", "superadmin"].includes(user.role)) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  const parsed = PeriodQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Parameter tidak valid." });
    return;
  }

  const defaults = getDefaultPeriod();
  const startDate = parsed.data.startDate ?? defaults.startDate;
  const endDate = parsed.data.endDate ?? defaults.endDate;

  let effectivePtId: string | undefined = parsed.data.ptId;
  if (user.ptId) {
    effectivePtId = user.ptId;
  }

  if (!effectivePtId) {
    res.status(400).json({ error: "ptId diperlukan." });
    return;
  }

  const branches = await db
    .select()
    .from(branchesTable)
    .where(eq(branchesTable.ptId, effectivePtId));

  const activitiesConds: SQL[] = [
    eq(dailyActivitiesTable.ptId, effectivePtId),
    gte(dailyActivitiesTable.date, startDate),
    lte(dailyActivitiesTable.date, endDate),
  ];

  const activities = await db
    .select()
    .from(dailyActivitiesTable)
    .where(and(...activitiesConds));

  const findingsConds: SQL[] = [
    eq(findingsTable.ptId, effectivePtId),
  ];

  const findings = await db
    .select()
    .from(findingsTable)
    .where(and(...findingsConds));

  const workingDays = getWorkingDays(startDate, endDate);

  const branchAnalytics = branches.map(br => {
    const brActivities = activities.filter(a => a.branchId === br.id);
    const uniqueDays = new Set(brActivities.map(a => a.date)).size;
    const updateRate = workingDays > 0 ? Math.min(100, Math.round((uniqueDays / workingDays) * 100)) : 0;
    const totalCustomers = brActivities.reduce((sum, a) => sum + (a.itemsReviewed ?? 0), 0);

    const brFindings = findings.filter(f => f.branchId === br.id);
    const openFindings = brFindings.filter(f => f.status !== "completed").length;

    let trafficLight: "green" | "yellow" | "red";
    if (openFindings === 0 && updateRate >= 80) {
      trafficLight = "green";
    } else if (openFindings <= 2 && updateRate >= 60) {
      trafficLight = "yellow";
    } else {
      trafficLight = "red";
    }

    return {
      branchId: br.id,
      branchName: br.name,
      updateRate,
      totalCustomers,
      openFindings,
      trafficLight,
    };
  });

  res.json({ startDate, endDate, workingDays, branches: branchAnalytics });
});

export default router;
