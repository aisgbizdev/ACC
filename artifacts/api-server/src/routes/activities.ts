import { Router, type IRouter } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, dailyActivitiesTable } from "@workspace/db";
import { CreateActivityBody, UpdateActivityBody, ListActivitiesQueryParams, UpdateActivityParams } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/activities", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  const parsed = ListActivitiesQueryParams.safeParse(req.query);

  let ptId = parsed.success ? parsed.data.ptId : undefined;
  const date = parsed.success ? parsed.data.date : undefined;

  if (user.ptId) {
    ptId = user.ptId;
  }

  const conditions: SQL[] = [];
  if (ptId) {
    conditions.push(eq(dailyActivitiesTable.ptId, ptId));
  }
  if (date) {
    conditions.push(eq(dailyActivitiesTable.date, date));
  }

  const activities = await db
    .select()
    .from(dailyActivitiesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(dailyActivitiesTable.date);
  res.json(activities);
});

router.post("/activities", requireRole("apuppt"), async (req, res): Promise<void> => {
  const user = req.session.user!;
  const parsed = CreateActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.ptId !== user.ptId) {
    res.status(403).json({ error: "Anda hanya bisa input aktivitas untuk PT Anda sendiri." });
    return;
  }

  const dateStr = parsed.data.date instanceof Date
    ? parsed.data.date.toISOString().split("T")[0]
    : String(parsed.data.date);

  const existing = await db
    .select()
    .from(dailyActivitiesTable)
    .where(
      and(
        eq(dailyActivitiesTable.ptId, parsed.data.ptId),
        eq(dailyActivitiesTable.date, dateStr)
      )
    );

  if (existing.length > 0) {
    res.status(400).json({ error: "Aktivitas untuk PT dan tanggal ini sudah ada. Silakan edit yang sudah ada." });
    return;
  }

  const [activity] = await db
    .insert(dailyActivitiesTable)
    .values({
      ...parsed.data,
      date: dateStr,
      userId: user.id,
    })
    .returning();

  res.status(201).json(activity);
});

router.put("/activities/:id", requireRole("apuppt"), async (req, res): Promise<void> => {
  const user = req.session.user!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const params = UpdateActivityParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(dailyActivitiesTable).where(eq(dailyActivitiesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Aktivitas tidak ditemukan." });
    return;
  }

  if (existing.ptId !== user.ptId) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  const [updated] = await db
    .update(dailyActivitiesTable)
    .set(parsed.data)
    .where(eq(dailyActivitiesTable.id, params.data.id))
    .returning();

  res.json(updated);
});

export default router;
