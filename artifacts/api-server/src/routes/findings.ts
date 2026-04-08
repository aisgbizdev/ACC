import { Router, type IRouter } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, findingsTable, branchesTable, ticketCommentsTable, usersTable } from "@workspace/db";
import {
  AcknowledgeFindingBody,
} from "@workspace/api-zod";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";
import { logAudit } from "../lib/audit";
import { notifyNewFinding, notifyNewComment } from "../lib/push-notify";

const FindingIdSchema = z.object({ id: z.string().uuid() });
const FindingStatusSchema = z.enum([
  "pending",
  "in_progress",
  "awaiting_verification",
  "completed",
  "follow_up",
]);

const ListFindingsQuerySchema = z.object({
  ptId: z.string().uuid().optional(),
  status: FindingStatusSchema.optional(),
});

const CreateFindingBodySchema = z.object({
  ptId: z.string().uuid(),
  branchId: z.string().uuid().nullable().optional(),
  date: z.union([z.string(), z.date()]),
  findingText: z.string().min(1),
  status: FindingStatusSchema.optional(),
  deadline: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
});

const router: IRouter = Router();

const UpdateTicketBody = z.object({
  findingText: z.string().optional(),
  status: z.enum(["pending", "in_progress", "awaiting_verification", "completed"]).optional(),
  notes: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
});

const AddCommentBody = z.object({
  content: z.string().min(1),
});

const findingsWithBranch = {
  id: findingsTable.id,
  ptId: findingsTable.ptId,
  branchId: findingsTable.branchId,
  branchName: branchesTable.name,
  reportedBy: findingsTable.reportedBy,
  assignedTo: findingsTable.assignedTo,
  date: findingsTable.date,
  findingText: findingsTable.findingText,
  status: findingsTable.status,
  deadline: findingsTable.deadline,
  notes: findingsTable.notes,
  dkAcknowledgedAt: findingsTable.dkAcknowledgedAt,
  dkAcknowledgedBy: findingsTable.dkAcknowledgedBy,
  dkNotes: findingsTable.dkNotes,
  escalatedAt: findingsTable.escalatedAt,
  escalationLevel: findingsTable.escalationLevel,
  createdAt: findingsTable.createdAt,
  updatedAt: findingsTable.updatedAt,
  closedAt: findingsTable.closedAt,
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  awaiting_verification: "Menunggu Verifikasi",
  completed: "Selesai",
};

router.get("/findings", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;

  if (user.role === "du") {
    res.status(403).json({ error: "Akses ditolak. DU tidak memiliki akses ke halaman Temuan." });
    return;
  }

  const parsed = ListFindingsQuerySchema.safeParse(req.query);

  let ptId = parsed.success ? parsed.data.ptId : undefined;
  const status = parsed.success ? parsed.data.status : undefined;

  if (user.ptId) {
    ptId = user.ptId;
  }

  const conditions: SQL[] = [];
  if (ptId) {
    conditions.push(eq(findingsTable.ptId, ptId));
  }
  if (status) {
    conditions.push(eq(findingsTable.status, status as "pending" | "in_progress" | "awaiting_verification" | "completed"));
  }

  const findings = await db
    .select(findingsWithBranch)
    .from(findingsTable)
    .leftJoin(branchesTable, eq(findingsTable.branchId, branchesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(findingsTable.date);
  res.json(findings);
});

router.get("/findings/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  if (user.role === "du") {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  const findingId = req.params.id as string;
  const [finding] = await db
    .select(findingsWithBranch)
    .from(findingsTable)
    .leftJoin(branchesTable, eq(findingsTable.branchId, branchesTable.id))
    .where(eq(findingsTable.id, findingId));

  if (!finding) {
    res.status(404).json({ error: "Temuan tidak ditemukan." });
    return;
  }

  if (user.ptId && finding.ptId !== user.ptId) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  res.json(finding);
});

router.post("/findings", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;

  if (user.role === "du" || user.role === "owner") {
    res.status(403).json({ error: "Akses ditolak. DU dan Owner tidak bisa membuat temuan." });
    return;
  }

  const parsed = CreateFindingBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (user.ptId && parsed.data.ptId !== user.ptId) {
    res.status(403).json({ error: "Anda hanya bisa membuat temuan untuk PT Anda sendiri." });
    return;
  }

  if (parsed.data.branchId) {
    const [branch] = await db.select({ ptId: branchesTable.ptId }).from(branchesTable).where(eq(branchesTable.id, parsed.data.branchId));
    if (!branch || branch.ptId !== parsed.data.ptId) {
      res.status(400).json({ error: "Cabang tidak ditemukan atau bukan milik PT tersebut." });
      return;
    }
  }

  const dateStr = parsed.data.date instanceof Date
    ? parsed.data.date.toISOString().split("T")[0]
    : String(parsed.data.date);

  // Deadline is required for new tickets
  const deadline = (req.body.deadline as string | undefined) ?? null;
  if (!deadline) {
    res.status(400).json({ error: "Deadline wajib diisi untuk setiap temuan." });
    return;
  }
  const assignedTo = (req.body.assignedTo as string | undefined) ?? null;

  const [finding] = await db
    .insert(findingsTable)
    .values({
      ptId: parsed.data.ptId,
      branchId: parsed.data.branchId ?? null,
      date: dateStr,
      findingText: parsed.data.findingText,
      status: (parsed.data.status ?? "pending") as "pending" | "in_progress" | "awaiting_verification" | "completed",
      notes: parsed.data.notes ?? null,
      deadline,
      assignedTo: assignedTo ?? null,
      reportedBy: user.id,
    })
    .returning();

  // System log comment for creation
  await db.insert(ticketCommentsTable).values({
    findingId: finding.id,
    authorId: null,
    content: `Tiket dibuat dengan status "${STATUS_LABEL[finding.status] ?? finding.status}".`,
    isSystemLog: true,
  });

  await logAudit("create_finding", "finding", finding.id, req, {
    ptId: parsed.data.ptId,
    afterData: { findingText: parsed.data.findingText, status: finding.status },
  });

  const [withBranch] = await db
    .select(findingsWithBranch)
    .from(findingsTable)
    .leftJoin(branchesTable, eq(findingsTable.branchId, branchesTable.id))
    .where(eq(findingsTable.id, finding.id));

  notifyNewFinding(parsed.data.ptId, parsed.data.findingText, user.id).catch(() => {});

  res.status(201).json(withBranch);
});

router.put("/findings/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;

  if (user.role === "du" || user.role === "owner") {
    res.status(403).json({ error: "Akses ditolak. Hanya APUPPT, DK, dan superadmin yang bisa mengubah temuan." });
    return;
  }

  const parsed = UpdateTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid.", detail: parsed.error.flatten() });
    return;
  }

  const findingId = req.params.id as string;
  const [existing] = await db.select().from(findingsTable).where(eq(findingsTable.id, findingId));
  if (!existing) {
    res.status(404).json({ error: "Temuan tidak ditemukan." });
    return;
  }

  if (user.ptId && existing.ptId !== user.ptId) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  const data = parsed.data;
  const statusChanged = data.status && data.status !== existing.status;
  const assigneeChanged = data.assignedTo !== undefined && data.assignedTo !== existing.assignedTo;

  const updateObj: Record<string, unknown> = {};
  if (data.findingText !== undefined) updateObj.findingText = data.findingText;
  if (data.status !== undefined) updateObj.status = data.status;
  if (data.notes !== undefined) updateObj.notes = data.notes ?? null;
  if (data.deadline !== undefined) updateObj.deadline = data.deadline ?? null;
  if (data.assignedTo !== undefined) updateObj.assignedTo = data.assignedTo ?? null;
  if (data.status === "completed" && existing.status !== "completed") {
    updateObj.closedAt = new Date();
  }

  await db.update(findingsTable).set(updateObj).where(eq(findingsTable.id, findingId));

  // Auto-log system comments
  if (statusChanged) {
    await db.insert(ticketCommentsTable).values({
      findingId: existing.id,
      authorId: user.id,
      content: `Status diubah dari "${STATUS_LABEL[existing.status] ?? existing.status}" ke "${STATUS_LABEL[data.status!] ?? data.status}".`,
      isSystemLog: true,
    });
  }

  if (assigneeChanged) {
    let assigneeName = "tidak ada";
    if (data.assignedTo) {
      const [assignee] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, data.assignedTo));
      assigneeName = assignee?.name ?? data.assignedTo;
    }
    await db.insert(ticketCommentsTable).values({
      findingId: existing.id,
      authorId: user.id,
      content: `Tiket di-assign ke: ${assigneeName}.`,
      isSystemLog: true,
    });
  }

  await logAudit("update_finding", "finding", existing.id, req, {
    ptId: existing.ptId,
    beforeData: { status: existing.status, findingText: existing.findingText },
    afterData: data,
  });

  const [withBranch] = await db
    .select(findingsWithBranch)
    .from(findingsTable)
    .leftJoin(branchesTable, eq(findingsTable.branchId, branchesTable.id))
    .where(eq(findingsTable.id, findingId));

  res.json(withBranch);
});

router.delete("/findings/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;

  if (user.role === "du" || user.role === "owner") {
    res.status(403).json({ error: "Akses ditolak. Hanya APUPPT, DK, dan superadmin yang bisa menghapus temuan." });
    return;
  }

  const findingId = req.params.id as string;
  const [existing] = await db.select().from(findingsTable).where(eq(findingsTable.id, findingId));
  if (!existing) {
    res.status(404).json({ error: "Temuan tidak ditemukan." });
    return;
  }

  if (user.ptId && existing.ptId !== user.ptId) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  await db.delete(ticketCommentsTable).where(eq(ticketCommentsTable.findingId, findingId));
  await db.delete(findingsTable).where(eq(findingsTable.id, findingId));

  await logAudit("delete_finding", "finding", findingId, req, {
    ptId: existing.ptId,
    beforeData: {
      findingText: existing.findingText,
      status: existing.status,
      assignedTo: existing.assignedTo,
      deadline: existing.deadline,
    },
  });

  res.status(204).send();
});

router.get("/findings/:id/comments", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  const findingId = req.params.id as string;

  const [finding] = await db.select({ ptId: findingsTable.ptId }).from(findingsTable).where(eq(findingsTable.id, findingId));
  if (!finding) {
    res.status(404).json({ error: "Temuan tidak ditemukan." });
    return;
  }
  if (user.ptId && finding.ptId !== user.ptId) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  const comments = await db
    .select({
      id: ticketCommentsTable.id,
      findingId: ticketCommentsTable.findingId,
      authorId: ticketCommentsTable.authorId,
      authorName: usersTable.name,
      content: ticketCommentsTable.content,
      isSystemLog: ticketCommentsTable.isSystemLog,
      createdAt: ticketCommentsTable.createdAt,
    })
    .from(ticketCommentsTable)
    .leftJoin(usersTable, eq(ticketCommentsTable.authorId, usersTable.id))
    .where(eq(ticketCommentsTable.findingId, findingId))
    .orderBy(ticketCommentsTable.createdAt);

  res.json(comments);
});

router.post("/findings/:id/comments", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  const findingId = req.params.id as string;

  const [finding] = await db.select({ ptId: findingsTable.ptId }).from(findingsTable).where(eq(findingsTable.id, findingId));
  if (!finding) {
    res.status(404).json({ error: "Temuan tidak ditemukan." });
    return;
  }
  if (user.ptId && finding.ptId !== user.ptId) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  const parsed = AddCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Konten komentar tidak boleh kosong." });
    return;
  }

  const [comment] = await db
    .insert(ticketCommentsTable)
    .values({
      findingId,
      authorId: user.id,
      content: parsed.data.content,
      isSystemLog: false,
    })
    .returning();

  await logAudit("add_comment", "ticket_comment", comment.id, req, {
    ptId: finding.ptId,
    afterData: { content: parsed.data.content },
  });

  const [withAuthor] = await db
    .select({
      id: ticketCommentsTable.id,
      findingId: ticketCommentsTable.findingId,
      authorId: ticketCommentsTable.authorId,
      authorName: usersTable.name,
      content: ticketCommentsTable.content,
      isSystemLog: ticketCommentsTable.isSystemLog,
      createdAt: ticketCommentsTable.createdAt,
    })
    .from(ticketCommentsTable)
    .leftJoin(usersTable, eq(ticketCommentsTable.authorId, usersTable.id))
    .where(eq(ticketCommentsTable.id, comment.id));

  notifyNewComment(findingId, finding.ptId, user.id, parsed.data.content).catch(() => {});

  res.status(201).json(withAuthor);
});

// Keep backward-compat complete endpoint
router.patch("/findings/:id/complete", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  const findingId = req.params.id as string;

  const [existing] = await db.select().from(findingsTable).where(eq(findingsTable.id, findingId));
  if (!existing) {
    res.status(404).json({ error: "Temuan tidak ditemukan." });
    return;
  }

  if (user.role === "du" || user.role === "owner") {
    res.status(403).json({ error: "Akses ditolak. Hanya APUPPT dan DK yang bisa menyelesaikan temuan." });
    return;
  }

  if (user.ptId && existing.ptId !== user.ptId) {
    res.status(403).json({ error: "Anda hanya bisa menyelesaikan temuan PT Anda sendiri." });
    return;
  }

  await db
    .update(findingsTable)
    .set({ status: "completed", closedAt: new Date() })
    .where(eq(findingsTable.id, findingId));

  await db.insert(ticketCommentsTable).values({
    findingId: existing.id,
    authorId: user.id,
    content: `Tiket diselesaikan.`,
    isSystemLog: true,
  });

  await logAudit("complete_finding", "finding", existing.id, req, {
    ptId: existing.ptId,
    beforeData: { status: existing.status },
    afterData: { status: "completed" },
  });

  const [withBranch] = await db
    .select(findingsWithBranch)
    .from(findingsTable)
    .leftJoin(branchesTable, eq(findingsTable.branchId, branchesTable.id))
    .where(eq(findingsTable.id, findingId));

  res.json(withBranch);
});

router.post("/findings/:id/acknowledge", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;

  if (user.role !== "dk" && user.role !== "superadmin") {
    res.status(403).json({ error: "Akses ditolak. Hanya DK yang bisa mengakui temuan." });
    return;
  }

  const findingId = req.params.id as string;
  const params = FindingIdSchema.safeParse({ id: findingId });
  if (!params.success) {
    res.status(400).json({ error: "ID tidak valid." });
    return;
  }

  const parsed = AcknowledgeFindingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid." });
    return;
  }

  const [existing] = await db.select().from(findingsTable).where(eq(findingsTable.id, findingId));
  if (!existing) {
    res.status(404).json({ error: "Temuan tidak ditemukan." });
    return;
  }

  await db
    .update(findingsTable)
    .set({
      dkAcknowledgedAt: new Date(),
      dkAcknowledgedBy: user.id,
      dkNotes: parsed.data.notes ?? null,
      status: existing.status === "pending" ? "follow_up" : existing.status,
    })
    .where(eq(findingsTable.id, findingId));

  const [withBranch] = await db
    .select(findingsWithBranch)
    .from(findingsTable)
    .leftJoin(branchesTable, eq(findingsTable.branchId, branchesTable.id))
    .where(eq(findingsTable.id, findingId));

  res.json(withBranch);
});

export default router;
