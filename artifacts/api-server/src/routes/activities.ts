import { Router, type IRouter } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, dailyActivitiesTable, branchesTable } from "@workspace/db";
import { CreateActivityBody, UpdateActivityBody, ListActivitiesQueryParams, UpdateActivityParams } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/activities", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  const parsed = ListActivitiesQueryParams.safeParse(req.query);

  let ptId = parsed.success ? parsed.data.ptId : undefined;
  const date = parsed.success ? parsed.data.date : undefined;
  const branchId = parsed.success ? parsed.data.branchId : undefined;

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
  if (branchId) {
    conditions.push(eq(dailyActivitiesTable.branchId, branchId));
  }

  const rows = await db
    .select({
      id: dailyActivitiesTable.id,
      ptId: dailyActivitiesTable.ptId,
      userId: dailyActivitiesTable.userId,
      branchId: dailyActivitiesTable.branchId,
      branchName: branchesTable.name,
      date: dailyActivitiesTable.date,
      activityType: dailyActivitiesTable.activityType,
      itemsReviewed: dailyActivitiesTable.itemsReviewed,
      customerRiskCategories: dailyActivitiesTable.customerRiskCategories,
      hasFinding: dailyActivitiesTable.hasFinding,
      findingSummary: dailyActivitiesTable.findingSummary,
      findingStatus: dailyActivitiesTable.findingStatus,
      notes: dailyActivitiesTable.notes,
      createdAt: dailyActivitiesTable.createdAt,
      updatedAt: dailyActivitiesTable.updatedAt,
    })
    .from(dailyActivitiesTable)
    .leftJoin(branchesTable, eq(dailyActivitiesTable.branchId, branchesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(dailyActivitiesTable.date);

  res.json(rows);
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

  const [activity] = await db
    .insert(dailyActivitiesTable)
    .values({
      ptId: parsed.data.ptId,
      branchId: parsed.data.branchId ?? null,
      date: dateStr,
      activityType: parsed.data.activityType,
      itemsReviewed: parsed.data.itemsReviewed,
      customerRiskCategories: parsed.data.customerRiskCategories ?? null,
      hasFinding: parsed.data.hasFinding,
      findingSummary: parsed.data.findingSummary ?? null,
      findingStatus: parsed.data.findingStatus ?? null,
      notes: parsed.data.notes ?? null,
      userId: user.id,
    })
    .returning();

  const [withBranch] = await db
    .select({
      id: dailyActivitiesTable.id,
      ptId: dailyActivitiesTable.ptId,
      userId: dailyActivitiesTable.userId,
      branchId: dailyActivitiesTable.branchId,
      branchName: branchesTable.name,
      date: dailyActivitiesTable.date,
      activityType: dailyActivitiesTable.activityType,
      itemsReviewed: dailyActivitiesTable.itemsReviewed,
      customerRiskCategories: dailyActivitiesTable.customerRiskCategories,
      hasFinding: dailyActivitiesTable.hasFinding,
      findingSummary: dailyActivitiesTable.findingSummary,
      findingStatus: dailyActivitiesTable.findingStatus,
      notes: dailyActivitiesTable.notes,
      createdAt: dailyActivitiesTable.createdAt,
      updatedAt: dailyActivitiesTable.updatedAt,
    })
    .from(dailyActivitiesTable)
    .leftJoin(branchesTable, eq(dailyActivitiesTable.branchId, branchesTable.id))
    .where(eq(dailyActivitiesTable.id, activity.id));

  res.status(201).json(withBranch);
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

  await db
    .update(dailyActivitiesTable)
    .set({
      ...(parsed.data.branchId !== undefined ? { branchId: parsed.data.branchId ?? null } : {}),
      ...(parsed.data.activityType ? { activityType: parsed.data.activityType } : {}),
      ...(parsed.data.itemsReviewed !== undefined ? { itemsReviewed: parsed.data.itemsReviewed } : {}),
      ...(parsed.data.customerRiskCategories !== undefined ? { customerRiskCategories: parsed.data.customerRiskCategories ?? null } : {}),
      ...(parsed.data.hasFinding !== undefined ? { hasFinding: parsed.data.hasFinding } : {}),
      ...(parsed.data.findingSummary !== undefined ? { findingSummary: parsed.data.findingSummary ?? null } : {}),
      ...(parsed.data.findingStatus !== undefined ? { findingStatus: parsed.data.findingStatus ?? null } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes ?? null } : {}),
    })
    .where(eq(dailyActivitiesTable.id, params.data.id));

  const [withBranch] = await db
    .select({
      id: dailyActivitiesTable.id,
      ptId: dailyActivitiesTable.ptId,
      userId: dailyActivitiesTable.userId,
      branchId: dailyActivitiesTable.branchId,
      branchName: branchesTable.name,
      date: dailyActivitiesTable.date,
      activityType: dailyActivitiesTable.activityType,
      itemsReviewed: dailyActivitiesTable.itemsReviewed,
      customerRiskCategories: dailyActivitiesTable.customerRiskCategories,
      hasFinding: dailyActivitiesTable.hasFinding,
      findingSummary: dailyActivitiesTable.findingSummary,
      findingStatus: dailyActivitiesTable.findingStatus,
      notes: dailyActivitiesTable.notes,
      createdAt: dailyActivitiesTable.createdAt,
      updatedAt: dailyActivitiesTable.updatedAt,
    })
    .from(dailyActivitiesTable)
    .leftJoin(branchesTable, eq(dailyActivitiesTable.branchId, branchesTable.id))
    .where(eq(dailyActivitiesTable.id, params.data.id));

  res.json(withBranch);
});

export default router;
