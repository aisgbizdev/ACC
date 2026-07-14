import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq, and, SQL, isNull, isNotNull, inArray } from "drizzle-orm";
import { db, dailyActivitiesTable, branchesTable, activityReviewsTable, usersTable, activityCommentsTable } from "@workspace/db";
import { CreateActivityBody, UpdateActivityBody, ListActivitiesQueryParams, UpdateActivityParams, ReviewActivityBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { z } from "zod";
import { logAudit } from "../lib/audit";
import { notifyNewActivity } from "../lib/push-notify";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const router: IRouter = Router();

const CUSTOMER_DATA_EXEMPT = ["sosialisasi", "libur"] as const;
const MAX_ACTIVITY_DOCS = 10;

const activityDocsDir = path.join(process.cwd(), "uploads", "activity-documents");
if (!fs.existsSync(activityDocsDir)) fs.mkdirSync(activityDocsDir, { recursive: true });

type ActivityDocument = {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};

const activityDocumentsSchema = z.array(
  z.object({
    id: z.string(),
    fileName: z.string(),
    originalName: z.string(),
    mimeType: z.string(),
    size: z.number(),
    uploadedAt: z.string(),
  }),
);

function parseDocuments(raw: unknown): ActivityDocument[] {
  const parsed = activityDocumentsSchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
}

const activityDocUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, activityDocsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || "";
      cb(null, `${Date.now()}-${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: MAX_ACTIVITY_DOCS },
  fileFilter: (_req, file, cb) => {
    const allowedMime = new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "application/csv",
      "application/vnd.csv",
      "image/jpeg",
      "image/png",
      "application/octet-stream",
    ]);
    const allowedExt = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".jpg", ".jpeg", ".png"]);
    const ext = path.extname(file.originalname ?? "").toLowerCase();
    if (allowedMime.has(file.mimetype) || allowedExt.has(ext)) {
      cb(null, true);
      return;
    }
    cb(new Error("Format dokumen tidak didukung."));
  },
});

const uploadActivityDocumentsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  activityDocUpload.array("documents", MAX_ACTIVITY_DOCS)(req, res, (err) => {
    if (err) {
      const message = err instanceof Error ? err.message : "Gagal mengunggah dokumen.";
      res.status(400).json({ error: message });
      return;
    }
    next();
  });
};

function toWibNoonUtc(dateStr: string): Date {
  return new Date(`${dateStr}T05:00:00.000Z`);
}

function defaultUploadDeadlineFromActivityDate(dateStr: string): Date {
  const base = new Date(`${dateStr}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + 1);
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, "0");
  const d = String(base.getUTCDate()).padStart(2, "0");
  return toWibNoonUtc(`${y}-${m}-${d}`);
}

function requiresCustomerData(activityType: string): boolean {
  return !(CUSTOMER_DATA_EXEMPT as readonly string[]).includes(activityType);
}

function extractInputTimeFromNotes(notes?: string | null): string | null {
  const raw = (notes ?? "").trim();
  if (!raw) return null;
  const match = raw.match(/\[time:(\d{2}:\d{2})\]/);
  return match?.[1] ?? null;
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
  documents: dailyActivitiesTable.documents,
  dkReviewedAt: dailyActivitiesTable.dkReviewedAt,
  dkReviewedBy: dailyActivitiesTable.dkReviewedBy,
  dkNotes: dailyActivitiesTable.dkNotes,
  duSignedOffAt: dailyActivitiesTable.duSignedOffAt,
  duSignedOffBy: dailyActivitiesTable.duSignedOffBy,
  reportSubmittedAt: dailyActivitiesTable.reportSubmittedAt,
  reportSubmittedBy: dailyActivitiesTable.reportSubmittedBy,
  uploadDeadlineAt: dailyActivitiesTable.uploadDeadlineAt,
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
    conditions.push(isNull(dailyActivitiesTable.duSignedOffAt));
  } else if (reviewStatus === "reviewed") {
    conditions.push(isNotNull(dailyActivitiesTable.duSignedOffAt));
    conditions.push(isNull(dailyActivitiesTable.reportSubmittedAt));
  } else if (reviewStatus === "signed_off") {
    conditions.push(isNotNull(dailyActivitiesTable.reportSubmittedAt));
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

  if (needsCustomerData && (data.itemsReviewed ?? 0) < 0) {
    res.status(400).json({ error: `Jumlah nasabah diperiksa tidak boleh negatif untuk jenis kegiatan ${data.activityType}.` });
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
      uploadDeadlineAt: defaultUploadDeadlineFromActivityDate(dateStr),
    })
    .returning();

  await logAudit("submit_activity", "activity", activity.id, req, {
    ptId: data.ptId,
    afterData: {
      activityType: data.activityType,
      date: data.date,
      inputTime: extractInputTimeFromNotes(data.notes ?? null),
    },
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
  if (needsCustomerData && (effectiveItemsReviewed ?? 0) < 0) {
    res.status(400).json({ error: `Jumlah nasabah diperiksa tidak boleh negatif untuk jenis kegiatan ${effectiveType}.` });
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

router.delete("/activities/:id", requireRole("du", "owner", "superadmin"), async (req, res): Promise<void> => {
  const user = req.session.user!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const params = ReviewParamsSchema.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: "ID aktivitas tidak valid." });
    return;
  }

  const [existing] = await db
    .select({
      id: dailyActivitiesTable.id,
      ptId: dailyActivitiesTable.ptId,
      documents: dailyActivitiesTable.documents,
      activityType: dailyActivitiesTable.activityType,
      date: dailyActivitiesTable.date,
    })
    .from(dailyActivitiesTable)
    .where(eq(dailyActivitiesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Aktivitas tidak ditemukan." });
    return;
  }

  if (user.ptId && existing.ptId !== user.ptId) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  await db.delete(activityReviewsTable).where(eq(activityReviewsTable.activityId, params.data.id));
  await db.delete(activityCommentsTable).where(eq(activityCommentsTable.activityId, params.data.id));
  await db.delete(dailyActivitiesTable).where(eq(dailyActivitiesTable.id, params.data.id));

  const docs = parseDocuments(existing.documents);
  for (const doc of docs) {
    fs.unlink(path.join(activityDocsDir, doc.fileName), () => undefined);
  }

  await logAudit("delete_activity", "activity", existing.id, req, {
    ptId: existing.ptId,
    beforeData: { activityType: existing.activityType, date: existing.date },
  });

  res.json({ success: true });
});

router.post("/activities/:id/review", requireRole("du"), async (req, res): Promise<void> => {
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

  if (user.ptId && existing.ptId !== user.ptId) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  const parsed = ReviewActivityBody.safeParse(req.body);

  await db
    .update(dailyActivitiesTable)
    .set({
      duSignedOffAt: new Date(),
      duSignedOffBy: user.id,
      ...(parsed.success ? { dkNotes: parsed.data.notes ?? null } : {}),
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

  if (user.ptId && existing.ptId !== user.ptId) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  if (existing.duSignedOffAt) {
    res.status(409).json({ error: "Aktivitas ini sudah di-approve DU." });
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

router.post("/activities/batch-review", requireRole("du"), async (req, res): Promise<void> => {
  const user = req.session.user!;
  const schema = z.object({ ids: z.array(z.string().uuid()).min(1), notes: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid." });
    return;
  }

  const { ids, notes } = parsed.data;

  const activities = await db
    .select({ id: dailyActivitiesTable.id, ptId: dailyActivitiesTable.ptId, duSignedOffAt: dailyActivitiesTable.duSignedOffAt })
    .from(dailyActivitiesTable)
    .where(inArray(dailyActivitiesTable.id, ids));

  const accessible = user.ptId
    ? activities.filter(a => a.ptId === user.ptId)
    : activities;

  const toReview = accessible.filter(a => !a.duSignedOffAt);

  if (toReview.length === 0) {
    res.status(400).json({ error: "Tidak ada aktivitas yang bisa direview (sudah direview atau tidak ditemukan)." });
    return;
  }

  const reviewedAt = new Date();
  await db
    .update(dailyActivitiesTable)
    .set({ duSignedOffAt: reviewedAt, duSignedOffBy: user.id, dkNotes: notes ?? null })
    .where(inArray(dailyActivitiesTable.id, toReview.map(a => a.id)));

  res.json({ reviewedCount: toReview.length });
});

router.post("/activities/:id/close-case", requireRole("apuppt"), async (req, res): Promise<void> => {
  const user = req.session.user!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ReviewParamsSchema.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: "ID aktivitas tidak valid." });
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

  if (!existing.duSignedOffAt) {
    res.status(400).json({ error: "Aktivitas belum di-approve DU." });
    return;
  }

  if (existing.reportSubmittedAt) {
    res.status(409).json({ error: "Aktivitas ini sudah ditandai Laporan Terkirim." });
    return;
  }

  await db
    .update(dailyActivitiesTable)
    .set({ reportSubmittedAt: new Date(), reportSubmittedBy: user.id })
    .where(eq(dailyActivitiesTable.id, params.data.id));

  const [withBranch] = await db
    .select(ACTIVITY_SELECT)
    .from(dailyActivitiesTable)
    .leftJoin(branchesTable, eq(dailyActivitiesTable.branchId, branchesTable.id))
    .where(eq(dailyActivitiesTable.id, params.data.id));

  res.json(withBranch);
});

router.post(
  "/activities/:id/documents",
  requireRole("apuppt"),
  uploadActivityDocumentsMiddleware,
  async (req, res): Promise<void> => {
    const user = req.session.user!;
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const params = ReviewParamsSchema.safeParse({ id: rawId });

    if (!params.success) {
      res.status(400).json({ error: "ID aktivitas tidak valid." });
      return;
    }

    const [activity] = await db
      .select({ id: dailyActivitiesTable.id, ptId: dailyActivitiesTable.ptId, documents: dailyActivitiesTable.documents })
      .from(dailyActivitiesTable)
      .where(eq(dailyActivitiesTable.id, params.data.id));

    if (!activity) {
      res.status(404).json({ error: "Aktivitas tidak ditemukan." });
      return;
    }

    if (activity.ptId !== user.ptId) {
      res.status(403).json({ error: "Akses ditolak." });
      return;
    }

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      res.status(400).json({ error: "Tidak ada dokumen yang diunggah." });
      return;
    }

    const existingDocs = parseDocuments(activity.documents);
    const uploadedDocs: ActivityDocument[] = files.map((file) => ({
      id: randomUUID(),
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    }));

    const nextDocs = [...existingDocs, ...uploadedDocs];
    if (nextDocs.length > MAX_ACTIVITY_DOCS) {
      for (const file of files) {
        fs.unlink(path.join(activityDocsDir, file.filename), () => undefined);
      }
      res.status(400).json({ error: `Maksimal ${MAX_ACTIVITY_DOCS} dokumen per aktivitas.` });
      return;
    }

    await db
      .update(dailyActivitiesTable)
      .set({ documents: nextDocs })
      .where(eq(dailyActivitiesTable.id, params.data.id));

    res.json({ documents: nextDocs });
  },
);

router.get("/activities/:id/documents/:docId/download", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const docId = Array.isArray(req.params.docId) ? req.params.docId[0] : req.params.docId;
  const params = ReviewParamsSchema.safeParse({ id: rawId });

  if (!params.success || !docId) {
    res.status(400).json({ error: "Parameter tidak valid." });
    return;
  }

  const [activity] = await db
    .select({ ptId: dailyActivitiesTable.ptId, documents: dailyActivitiesTable.documents })
    .from(dailyActivitiesTable)
    .where(eq(dailyActivitiesTable.id, params.data.id));

  if (!activity) {
    res.status(404).json({ error: "Aktivitas tidak ditemukan." });
    return;
  }

  if (user.ptId && activity.ptId !== user.ptId) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  const docs = parseDocuments(activity.documents);
  const doc = docs.find((item) => item.id === docId);

  if (!doc) {
    res.status(404).json({ error: "Dokumen tidak ditemukan." });
    return;
  }

  const filePath = path.join(activityDocsDir, doc.fileName);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File dokumen tidak ditemukan di server." });
    return;
  }

  res.download(filePath, doc.originalName);
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
