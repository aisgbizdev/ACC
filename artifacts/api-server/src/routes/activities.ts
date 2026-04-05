import { Router, type IRouter } from "express";
import { eq, and, SQL, isNull, isNotNull, inArray } from "drizzle-orm";
import { db, dailyActivitiesTable, branchesTable, activityReviewsTable, usersTable, activityCommentsTable } from "@workspace/db";
import { CreateActivityBody, UpdateActivityBody, ListActivitiesQueryParams, UpdateActivityParams, ReviewActivityBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { z } from "zod";
import { logAudit } from "../lib/audit";
import { notifyNewActivity } from "../lib/push-notify";

const router: IRouter = Router();

const CUSTOMER_DATA_EXEMPT = ["sosialisasi", "libur"] as const;

function requiresCustomerData(activityType: string): boolean {
  return !(CUSTOMER_DATA_EXEMPT as readonly string[]).includes(activityType);
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
  dkReviewedAt: dailyActivitiesTable.dkReviewedAt,
  dkReviewedBy: dailyActivitiesTable.dkReviewedBy,
  dkNotes: dailyActivitiesTable.dkNotes,
  duSignedOffAt: dailyActivitiesTable.duSignedOffAt,
  duSignedOffBy: dailyActivitiesTable.duSignedOffBy,
  createdAt: dailyActivitiesTable.createdAt,
  updatedAt: dailyActivitiesTable.updatedAt,
};

const ReviewParamsSchema = z.object({ id: z.string().uuid() });

router.get("/activities", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  const parsed = ListActivitiesQueryParams.safeParse(req.query);

  let ptId = parsed.success ? parsed.data.ptId : undefined;
  const date = parsed.success ? parsed.data.date : undefined;
  const branchId = parsed.success ? parsed.data.branchId : undefined;
  const reviewStatus = parsed.success ? parsed.data.reviewStatus : undefined;

  if (user.ptId) {
    ptId = user.ptId;
  }

  const conditions: SQL[] = [];
  if (ptId) conditions.push(eq(dailyActivitiesTable.ptId, ptId));
  if (date) conditions.push(eq(dailyActivitiesTable.date, date));
  if (branchId) conditions.push(eq(dailyActivitiesTable.branchId, branchId));

  if (reviewStatus === "pending_review") {
    conditions.push(isNull(dailyActivitiesTable.dkReviewedAt));
  } else if (reviewStatus === "reviewed") {
    conditions.push(isNotNull(dailyActivitiesTable.dkReviewedAt));
    conditions.push(isNull(dailyActivitiesTable.duSignedOffAt));
  } else if (reviewStatus === "signed_off") {
    conditions.push(isNotNull(dailyActivitiesTable.duSignedOffAt));
  }

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

  await logAudit("submit_activity", "activity", activity.id, req, {
    ptId: data.ptId,
    afterData: { activityType: data.activityType, date: data.date },
  });

  const [withBranch] = await db
    .select(ACTIVITY_SELECT)
    .from(dailyActivitiesTable)
    .leftJoin(branchesTable, eq(dailyActivitiesTable.branchId, branchesTable.id))
    .where(eq(dailyActivitiesTable.id, activity.id));

  notifyNewActivity(data.ptId, data.activityType, user.id).catch(() => {});

  res.status(201).json(withBranch);
});

router.put("/activities/:id", requireRole("apuppt"), async (req, res): Promise<void> => {
  const user = req.session.user!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const params = ReviewParamsSchema.safeParse({ id: rawId });
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

router.post("/activities/:id/review", requireRole("dk"), async (req, res): Promise<void> => {
  const user = req.session.user!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const params = ReviewParamsSchema.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: "ID tidak valid." });
    return;
  }

  const parsed = ReviewActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid." });
    return;
  }

  const [existing] = await db.select().from(dailyActivitiesTable).where(eq(dailyActivitiesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Aktivitas tidak ditemukan." });
    return;
  }

  await db
    .update(dailyActivitiesTable)
    .set({
      dkReviewedAt: new Date(),
      dkReviewedBy: user.id,
      dkNotes: parsed.data.notes ?? null,
    })
    .where(eq(dailyActivitiesTable.id, params.data.id));

  const [withBranch] = await db
    .select(ACTIVITY_SELECT)
    .from(dailyActivitiesTable)
    .leftJoin(branchesTable, eq(dailyActivitiesTable.branchId, branchesTable.id))
    .where(eq(dailyActivitiesTable.id, params.data.id));

  res.json(withBranch);
});

router.post("/activities/:id/signoff", requireRole("du"), async (req, res): Promise<void> => {
  const user = req.session.user!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const params = ReviewParamsSchema.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: "ID tidak valid." });
    return;
  }

  const [existing] = await db.select().from(dailyActivitiesTable).where(eq(dailyActivitiesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Aktivitas tidak ditemukan." });
    return;
  }

  if (!existing.dkReviewedAt) {
    res.status(400).json({ error: "Aktivitas belum disetujui oleh DK. DU hanya bisa sign-off setelah DK mereview." });
    return;
  }

  await db
    .update(dailyActivitiesTable)
    .set({
      duSignedOffAt: new Date(),
      duSignedOffBy: user.id,
    })
    .where(eq(dailyActivitiesTable.id, params.data.id));

  const [withBranch] = await db
    .select(ACTIVITY_SELECT)
    .from(dailyActivitiesTable)
    .leftJoin(branchesTable, eq(dailyActivitiesTable.branchId, branchesTable.id))
    .where(eq(dailyActivitiesTable.id, params.data.id));

  res.json(withBranch);
});

router.post("/activities/batch-review", requireRole("dk"), async (req, res): Promise<void> => {
  const user = req.session.user!;
  const schema = z.object({ ids: z.array(z.string().uuid()).min(1), notes: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid." });
    return;
  }

  const { ids, notes } = parsed.data;

  const activities = await db
    .select({ id: dailyActivitiesTable.id, ptId: dailyActivitiesTable.ptId, dkReviewedAt: dailyActivitiesTable.dkReviewedAt })
    .from(dailyActivitiesTable)
    .where(inArray(dailyActivitiesTable.id, ids));

  const accessible = user.ptId
    ? activities.filter(a => a.ptId === user.ptId)
    : activities;

  const toReview = accessible.filter(a => !a.dkReviewedAt);

  if (toReview.length === 0) {
    res.status(400).json({ error: "Tidak ada aktivitas yang bisa direview (sudah direview atau tidak ditemukan)." });
    return;
  }

  const reviewedAt = new Date();
  await db
    .update(dailyActivitiesTable)
    .set({ dkReviewedAt: reviewedAt, dkReviewedBy: user.id, dkNotes: notes ?? null })
    .where(inArray(dailyActivitiesTable.id, toReview.map(a => a.id)));

  res.json({ reviewedCount: toReview.length });
});

router.get("/activities/:id/comments", requireAuth, async (req, res): Promise<void> => {
  const rawId = req.params.id as string;
  const comments = await db
    .select({
      id: activityCommentsTable.id,
      activityId: activityCommentsTable.activityId,
      content: activityCommentsTable.content,
      createdAt: activityCommentsTable.createdAt,
      authorId: activityCommentsTable.authorId,
      authorName: usersTable.name,
      authorRole: usersTable.role,
    })
    .from(activityCommentsTable)
    .leftJoin(usersTable, eq(activityCommentsTable.authorId, usersTable.id))
    .where(eq(activityCommentsTable.activityId, rawId))
    .orderBy(activityCommentsTable.createdAt);

  res.json(comments);
});

router.post("/activities/:id/comments", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  const rawId = req.params.id as string;
  const schema = z.object({ content: z.string().min(1).max(1000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Komentar tidak boleh kosong." });
    return;
  }

  const [activity] = await db
    .select({ id: dailyActivitiesTable.id, ptId: dailyActivitiesTable.ptId })
    .from(dailyActivitiesTable)
    .where(eq(dailyActivitiesTable.id, rawId));

  if (!activity) {
    res.status(404).json({ error: "Aktivitas tidak ditemukan." });
    return;
  }

  if (user.ptId && activity.ptId !== user.ptId) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  const [comment] = await db
    .insert(activityCommentsTable)
    .values({ activityId: rawId, authorId: user.id, content: parsed.data.content })
    .returning();

  const [withAuthor] = await db
    .select({
      id: activityCommentsTable.id,
      activityId: activityCommentsTable.activityId,
      content: activityCommentsTable.content,
      createdAt: activityCommentsTable.createdAt,
      authorId: activityCommentsTable.authorId,
      authorName: usersTable.name,
      authorRole: usersTable.role,
    })
    .from(activityCommentsTable)
    .leftJoin(usersTable, eq(activityCommentsTable.authorId, usersTable.id))
    .where(eq(activityCommentsTable.id, comment.id));

  res.status(201).json(withAuthor);
});

export default router;
