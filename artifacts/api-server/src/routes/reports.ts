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

export default router;
