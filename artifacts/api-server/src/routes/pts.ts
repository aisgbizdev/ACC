import { Router, type IRouter } from "express";
import { eq, desc, and, gte } from "drizzle-orm";
import { db, ptsTable, dailyActivitiesTable, findingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { computeTrafficLight } from "../lib/traffic-light";

const router: IRouter = Router();

router.get("/pts", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;

  if (user.ptId) {
    const pts = await db.select().from(ptsTable).where(eq(ptsTable.id, user.ptId));
    res.json(pts);
    return;
  }

  const pts = await db.select().from(ptsTable).orderBy(ptsTable.code);
  res.json(pts);
});

router.get("/pts/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (user.ptId && user.ptId !== rawId) {
    res.status(403).json({ error: "Akses ditolak. Anda hanya bisa melihat PT Anda sendiri." });
    return;
  }

  const [pt] = await db.select().from(ptsTable).where(eq(ptsTable.id, rawId));
  if (!pt) {
    res.status(404).json({ error: "PT tidak ditemukan." });
    return;
  }

  const today = new Date().toISOString().split("T")[0];

  const [lastActivity] = await db
    .select()
    .from(dailyActivitiesTable)
    .where(eq(dailyActivitiesTable.ptId, rawId))
    .orderBy(desc(dailyActivitiesTable.date))
    .limit(1);

  const openFindings = await db
    .select()
    .from(findingsTable)
    .where(eq(findingsTable.ptId, rawId));

  const openCount = openFindings.filter((f) => f.status !== "completed").length;
  const status = computeTrafficLight(lastActivity?.date ?? null, openFindings, today);

  res.json({
    ...pt,
    status,
    lastActivityDate: lastActivity?.date ?? null,
    openFindingsCount: openCount,
  });
});

router.get("/pts/:id/status", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (user.ptId && user.ptId !== rawId) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  const today = new Date().toISOString().split("T")[0];

  const [lastActivity] = await db
    .select()
    .from(dailyActivitiesTable)
    .where(eq(dailyActivitiesTable.ptId, rawId))
    .orderBy(desc(dailyActivitiesTable.date))
    .limit(1);

  const openFindings = await db
    .select()
    .from(findingsTable)
    .where(eq(findingsTable.ptId, rawId));

  const openCount = openFindings.filter((f) => f.status !== "completed").length;
  const overdueCount = openFindings.filter((f) => {
    if (f.status === "completed") return false;
    const daysDiff = Math.floor((new Date(today).getTime() - new Date(f.date).getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff > 3;
  }).length;

  const status = computeTrafficLight(lastActivity?.date ?? null, openFindings, today);

  res.json({
    ptId: rawId,
    status,
    lastActivityDate: lastActivity?.date ?? null,
    openFindingsCount: openCount,
    overdueCount,
  });
});

router.get("/pts/:id/history", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const days = parseInt(req.query.days as string ?? "7", 10) || 7;

  if (user.ptId && user.ptId !== rawId) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  const history: Array<{ date: string; status: string }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    const [lastActivity] = await db
      .select()
      .from(dailyActivitiesTable)
      .where(and(eq(dailyActivitiesTable.ptId, rawId), gte(dailyActivitiesTable.date, dateStr)))
      .orderBy(dailyActivitiesTable.date)
      .limit(1);

    const allFindings = await db
      .select()
      .from(findingsTable)
      .where(eq(findingsTable.ptId, rawId));

    const status = computeTrafficLight(lastActivity?.date ?? null, allFindings, dateStr);
    history.push({ date: dateStr, status });
  }

  res.json(history);
});

export default router;
