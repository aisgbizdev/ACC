import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, SQL } from "drizzle-orm";
import { db, ptsTable, dailyActivitiesTable, findingsTable, activityReviewsTable, reportSignoffsTable, usersTable } from "@workspace/db";
import { requireRole, requireAuth } from "../middlewares/auth";
import { computeTrafficLight } from "../lib/traffic-light";
import * as XLSX from "xlsx";

const router: IRouter = Router();

async function buildSummaries(
  user: { ptId?: string | null; role?: string },
  startDate: string | undefined,
  endDate: string | undefined,
  ptIdFilter: string | undefined,
  periodType: string | undefined,
  today: string
) {
  let pts = await db.select().from(ptsTable).orderBy(ptsTable.code);

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

      const activityBreakdown: Record<string, number> = {};
      for (const a of activities) {
        activityBreakdown[a.activityType] = (activityBreakdown[a.activityType] ?? 0) + 1;
      }

      const totalItemsReviewed = activities.reduce((sum, a) => sum + (a.itemsReviewed ?? 0), 0);

      let duSignoff = null;
      if (startDate && endDate) {
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

  return summaries;
}

router.get("/reports/summary", requireRole("dk", "du", "owner", "superadmin"), async (req, res): Promise<void> => {
  const user = req.session.user!;
  const today = new Date().toISOString().split("T")[0];

  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const ptIdFilter = req.query.ptId as string | undefined;
  const periodType = req.query.periodType as string | undefined;

  const summaries = await buildSummaries(user, startDate, endDate, ptIdFilter, periodType, today);

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

router.get("/reports/export", requireRole("dk", "du", "owner", "superadmin"), async (req, res): Promise<void> => {
  const user = req.session.user!;
  const today = new Date().toISOString().split("T")[0];

  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const ptIdFilter = req.query.ptId as string | undefined;
  const periodType = req.query.periodType as string | undefined;

  const summaries = await buildSummaries(user, startDate, endDate, ptIdFilter, periodType, today);

  const STATUS_LABELS: Record<string, string> = { green: "Hijau", yellow: "Kuning", red: "Merah" };

  const rows = summaries.map((s) => ({
    "Kode PT": s.ptCode,
    "Nama PT": s.ptName,
    "Total Aktivitas": s.totalActivities,
    "Nasabah Diperiksa": s.totalItemsReviewed,
    "Temuan Terbuka": s.openFindings,
    "Temuan Selesai": s.completedFindings,
    "% Review DK": `${s.dkReviewPct}%`,
    "Sign-Off DU": s.duSignoff ? `Ya (${s.duSignoff.signerName ?? "-"})` : "Belum",
    "Status Traffic Light": STATUS_LABELS[s.status] ?? s.status,
    "Aktivitas Terakhir": s.lastActivityDate ?? "-",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  ws["!cols"] = [
    { wch: 12 }, { wch: 30 }, { wch: 16 }, { wch: 18 },
    { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 22 },
    { wch: 18 }, { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Laporan");

  const periode = startDate && endDate ? `${startDate}_${endDate}` : today;
  const fileName = `laporan-acc-${periode}.xlsx`;

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(buf);
});

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

function computeKpiScore(metrics: {
  updateRate: number;
  findingsResolved: number;
  findingsCreated: number;
}): number {
  const { updateRate, findingsResolved, findingsCreated } = metrics;
  let score = 0;
  score += updateRate * 0.4;
  const resolveRate = findingsCreated > 0 ? (findingsResolved / findingsCreated) * 100 : 100;
  score += resolveRate * 0.35;
  score += 25;
  return Math.min(100, Math.round(score));
}

router.get("/reports/trend", requireRole("dk", "du", "owner", "superadmin"), async (req, res): Promise<void> => {
  const user = req.session.user!;
  const ptIdParam = req.query.ptId as string | undefined;
  const monthsParam = parseInt(req.query.months as string ?? "3", 10);
  const months = isNaN(monthsParam) || monthsParam < 1 ? 3 : Math.min(monthsParam, 12);

  let effectivePtId: string | undefined = ptIdParam;
  if (user.ptId) {
    effectivePtId = user.ptId;
  }

  let pts = await db.select().from(ptsTable).orderBy(ptsTable.code);
  if (effectivePtId) {
    pts = pts.filter((p) => p.id === effectivePtId);
  }

  const now = new Date();
  const monthsList: { year: number; month: number; label: string; startDate: string; endDate: string }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const label = d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
    monthsList.push({ year, month, label, startDate, endDate });
  }

  const trendData = await Promise.all(
    pts.map(async (pt) => {
      const monthlyData = await Promise.all(
        monthsList.map(async (m) => {
          const activities = await db
            .select()
            .from(dailyActivitiesTable)
            .where(
              and(
                eq(dailyActivitiesTable.ptId, pt.id),
                gte(dailyActivitiesTable.date, m.startDate),
                lte(dailyActivitiesTable.date, m.endDate)
              )
            );

          const findings = await db
            .select()
            .from(findingsTable)
            .where(
              and(
                eq(findingsTable.ptId, pt.id),
                gte(findingsTable.date, m.startDate),
                lte(findingsTable.date, m.endDate)
              )
            );

          const workingDays = getWorkingDays(m.startDate, m.endDate);
          const uniqueDays = new Set(activities.map((a) => a.date)).size;
          const updateRate = workingDays > 0 ? Math.min(100, Math.round((uniqueDays / workingDays) * 100)) : 0;

          const totalActivities = activities.length;
          const totalItemsReviewed = activities.reduce((sum, a) => sum + (a.itemsReviewed ?? 0), 0);
          const openFindings = findings.filter((f) => f.status !== "completed").length;
          const completedFindings = findings.filter((f) => f.status === "completed").length;

          const kpiScore = computeKpiScore({
            updateRate,
            findingsResolved: completedFindings,
            findingsCreated: findings.length,
          });

          return {
            month: m.label,
            startDate: m.startDate,
            endDate: m.endDate,
            updateRate,
            totalActivities,
            totalItemsReviewed,
            openFindings,
            completedFindings,
            kpiScore,
          };
        })
      );

      return {
        ptId: pt.id,
        ptCode: pt.code,
        ptName: pt.name,
        months: monthlyData,
      };
    })
  );

  res.json({ trend: trendData });
});

router.get("/reports/monthly-recap", requireRole("dk", "du", "owner", "superadmin"), async (req, res): Promise<void> => {
  const user = req.session.user!;
  const yearParam = parseInt(req.query.year as string, 10);
  const monthParam = parseInt(req.query.month as string, 10);

  if (isNaN(yearParam) || isNaN(monthParam) || monthParam < 1 || monthParam > 12) {
    res.status(400).json({ error: "Parameter year dan month tidak valid." });
    return;
  }

  const startDate = `${yearParam}-${String(monthParam).padStart(2, "0")}-01`;
  const lastDay = new Date(yearParam, monthParam, 0).getDate();
  const endDate = `${yearParam}-${String(monthParam).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const prevMonthDate = new Date(yearParam, monthParam - 2, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth() + 1;
  const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
  const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
  const prevEndDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(prevLastDay).padStart(2, "0")}`;

  let pts = await db.select().from(ptsTable).orderBy(ptsTable.code);
  if (user.ptId) {
    pts = pts.filter((p) => p.id === user.ptId);
  }

  const workingDays = getWorkingDays(startDate, endDate);
  const prevWorkingDays = getWorkingDays(prevStartDate, prevEndDate);

  const recaps = await Promise.all(
    pts.map(async (pt) => {
      const [activities, prevActivities, findings, prevFindings, signoffs] = await Promise.all([
        db.select().from(dailyActivitiesTable).where(
          and(eq(dailyActivitiesTable.ptId, pt.id), gte(dailyActivitiesTable.date, startDate), lte(dailyActivitiesTable.date, endDate))
        ),
        db.select().from(dailyActivitiesTable).where(
          and(eq(dailyActivitiesTable.ptId, pt.id), gte(dailyActivitiesTable.date, prevStartDate), lte(dailyActivitiesTable.date, prevEndDate))
        ),
        db.select().from(findingsTable).where(
          and(eq(findingsTable.ptId, pt.id), gte(findingsTable.date, startDate), lte(findingsTable.date, endDate))
        ),
        db.select().from(findingsTable).where(
          and(eq(findingsTable.ptId, pt.id), gte(findingsTable.date, prevStartDate), lte(findingsTable.date, prevEndDate))
        ),
        db.select({
          signedOffAt: reportSignoffsTable.signedOffAt,
          signerName: usersTable.name,
          periodType: reportSignoffsTable.periodType,
        })
          .from(reportSignoffsTable)
          .leftJoin(usersTable, eq(reportSignoffsTable.signedOffBy, usersTable.id))
          .where(
            and(
              eq(reportSignoffsTable.ptId, pt.id),
              eq(reportSignoffsTable.periodType, "monthly"),
              eq(reportSignoffsTable.periodStart, startDate),
              eq(reportSignoffsTable.periodEnd, endDate)
            )
          ),
      ]);

      const uniqueDays = new Set(activities.map((a) => a.date)).size;
      const prevUniqueDays = new Set(prevActivities.map((a) => a.date)).size;

      const updateRate = workingDays > 0 ? Math.min(100, Math.round((uniqueDays / workingDays) * 100)) : 0;
      const prevUpdateRate = prevWorkingDays > 0 ? Math.min(100, Math.round((prevUniqueDays / prevWorkingDays) * 100)) : 0;

      const totalItemsReviewed = activities.reduce((sum, a) => sum + (a.itemsReviewed ?? 0), 0);
      const prevTotalItemsReviewed = prevActivities.reduce((sum, a) => sum + (a.itemsReviewed ?? 0), 0);

      const openFindings = findings.filter((f) => f.status !== "completed").length;
      const completedFindings = findings.filter((f) => f.status === "completed").length;
      const prevOpenFindings = prevFindings.filter((f) => f.status !== "completed").length;
      const prevCompletedFindings = prevFindings.filter((f) => f.status === "completed").length;

      let dkReviewedCount = 0;
      if (activities.length > 0) {
        for (const act of activities) {
          const [rev] = await db
            .select({ id: activityReviewsTable.id })
            .from(activityReviewsTable)
            .where(eq(activityReviewsTable.activityId, act.id));
          if (rev) dkReviewedCount++;
        }
      }
      const dkReviewPct = activities.length > 0 ? Math.round((dkReviewedCount / activities.length) * 100) : 0;

      const kpiScore = computeKpiScore({
        updateRate,
        findingsResolved: completedFindings,
        findingsCreated: findings.length,
      });
      const prevKpiScore = computeKpiScore({
        updateRate: prevUpdateRate,
        findingsResolved: prevCompletedFindings,
        findingsCreated: prevFindings.length,
      });

      const duSignoff = signoffs[0] ?? null;

      return {
        ptId: pt.id,
        ptCode: pt.code,
        ptName: pt.name,
        totalActiveDays: uniqueDays,
        totalItemsReviewed,
        openFindings,
        completedFindings,
        dkReviewPct,
        duSignoff,
        kpiScore,
        updateRate,
        delta: {
          updateRate: updateRate - prevUpdateRate,
          totalItemsReviewed: totalItemsReviewed - prevTotalItemsReviewed,
          openFindings: openFindings - prevOpenFindings,
          completedFindings: completedFindings - prevCompletedFindings,
          kpiScore: kpiScore - prevKpiScore,
        },
        prev: {
          updateRate: prevUpdateRate,
          totalItemsReviewed: prevTotalItemsReviewed,
          openFindings: prevOpenFindings,
          completedFindings: prevCompletedFindings,
          kpiScore: prevKpiScore,
        },
      };
    })
  );

  res.json({
    year: yearParam,
    month: monthParam,
    startDate,
    endDate,
    workingDays,
    prevMonth: {
      year: prevYear,
      month: prevMonth,
      startDate: prevStartDate,
      endDate: prevEndDate,
      workingDays: prevWorkingDays,
    },
    recaps,
  });
});

export default router;
