import { Router, type IRouter } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, dailyActivitiesTable, branchesTable } from "@workspace/db";
import { CreateActivityBody, UpdateActivityBody, ListActivitiesQueryParams, UpdateActivityParams } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

const SOSIALISASI_ONLY_EXEMPT = ["sosialisasi"] as const;

function requiresCustomerData(activityType: string): boolean {
  return !(SOSIALISASI_ONLY_EXEMPT as readonly string[]).includes(activityType);
}

async function validateBranchBelongsToPt(branchId: string, ptId: string): Promise<boolean> {
  const [branch] = await db.select({ ptId: branchesTable.ptId }).from(branchesTable).where(eq(branchesTable.id, branchId));
  return !!branch && branch.ptId === ptId;
}

const ACTIVITY_SELECT = {
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
};

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
  if (ptId) conditions.push(eq(dailyActivitiesTable.ptId, ptId));
  if (date) conditions.push(eq(dailyActivitiesTable.date, date));
  if (branchId) conditions.push(eq(dailyActivitiesTable.branchId, branchId));

  const rows = await db
    .select(ACTIVITY_SELECT)
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
    res.status(400).json({ error: "Data tidak valid.", detail: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  if (data.ptId !== user.ptId) {
    res.status(403).json({ error: "Anda hanya bisa input aktivitas untuk PT Anda sendiri." });
    return;
  }

  if (data.branchId) {
    const valid = await validateBranchBelongsToPt(data.branchId, data.ptId);
    if (!valid) {
      res.status(400).json({ error: "Cabang tidak ditemukan atau bukan milik PT Anda." });
      return;
    }
  }

  const needsCustomerData = requiresCustomerData(data.activityType);

  if (needsCustomerData && (data.itemsReviewed ?? 0) <= 0) {
    res.status(400).json({ error: `Jumlah nasabah diperiksa harus lebih dari 0 untuk jenis kegiatan ${data.activityType}.` });
    return;
  }

  if (needsCustomerData && (!data.customerRiskCategories || data.customerRiskCategories.length === 0)) {
    res.status(400).json({ error: `Kategori risiko nasabah wajib dipilih untuk jenis kegiatan ${data.activityType}.` });
    return;
  }

  const dateStr = data.date instanceof Date
    ? data.date.toISOString().split("T")[0]
    : String(data.date);

  const [activity] = await db
    .insert(dailyActivitiesTable)
    .values({
      ptId: data.ptId,
      branchId: data.branchId ?? null,
      date: dateStr,
      activityType: data.activityType,
      itemsReviewed: data.itemsReviewed,
      customerRiskCategories: data.customerRiskCategories ?? null,
      hasFinding: data.hasFinding,
      findingSummary: data.findingSummary ?? null,
      findingStatus: data.findingStatus ?? null,
      notes: data.notes ?? null,
      userId: user.id,
    })
    .returning();

  const [withBranch] = await db
    .select(ACTIVITY_SELECT)
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
    res.status(400).json({ error: "Data tidak valid.", detail: parsed.error.flatten() });
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

  const today = new Date().toISOString().split("T")[0];
  if (existing.date !== today) {
    res.status(403).json({ error: "Aktivitas lama tidak dapat diubah. Hanya aktivitas hari ini yang dapat diedit." });
    return;
  }

  const data = parsed.data;

  if (data.branchId) {
    const valid = await validateBranchBelongsToPt(data.branchId, existing.ptId);
    if (!valid) {
      res.status(400).json({ error: "Cabang tidak ditemukan atau bukan milik PT Anda." });
      return;
    }
  }

  const effectiveType = data.activityType ?? existing.activityType;
  const needsCustomerData = requiresCustomerData(effectiveType);

  const effectiveItemsReviewed = data.itemsReviewed !== undefined ? data.itemsReviewed : existing.itemsReviewed;
  const effectiveRiskCats = data.customerRiskCategories !== undefined ? data.customerRiskCategories : existing.customerRiskCategories;

  if (needsCustomerData && (effectiveItemsReviewed ?? 0) <= 0) {
    res.status(400).json({ error: `Jumlah nasabah diperiksa harus lebih dari 0 untuk jenis kegiatan ${effectiveType}.` });
    return;
  }

  if (needsCustomerData && (!effectiveRiskCats || effectiveRiskCats.length === 0)) {
    res.status(400).json({ error: `Kategori risiko nasabah wajib dipilih untuk jenis kegiatan ${effectiveType}.` });
    return;
  }

  await db
    .update(dailyActivitiesTable)
    .set({
      ...(data.branchId !== undefined ? { branchId: data.branchId ?? null } : {}),
      ...(data.activityType ? { activityType: data.activityType } : {}),
      ...(data.itemsReviewed !== undefined ? { itemsReviewed: data.itemsReviewed } : {}),
      ...(data.customerRiskCategories !== undefined ? { customerRiskCategories: data.customerRiskCategories ?? null } : {}),
      ...(data.hasFinding !== undefined ? { hasFinding: data.hasFinding } : {}),
      ...(data.findingSummary !== undefined ? { findingSummary: data.findingSummary ?? null } : {}),
      ...(data.findingStatus !== undefined ? { findingStatus: data.findingStatus ?? null } : {}),
      ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
    })
    .where(eq(dailyActivitiesTable.id, params.data.id));

  const [withBranch] = await db
    .select(ACTIVITY_SELECT)
    .from(dailyActivitiesTable)
    .leftJoin(branchesTable, eq(dailyActivitiesTable.branchId, branchesTable.id))
    .where(eq(dailyActivitiesTable.id, params.data.id));

  res.json(withBranch);
});

export default router;
