import { Router, type IRouter } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, findingsTable, branchesTable } from "@workspace/db";
import {
  CreateFindingBody,
  UpdateFindingBody,
  ListFindingsQueryParams,
  UpdateFindingParams,
  CompleteFindingParams,
  AcknowledgeFindingBody,
} from "@workspace/api-zod";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const FindingIdSchema = z.object({ id: z.string().uuid() });

const router: IRouter = Router();

const findingsWithBranch = {
  id: findingsTable.id,
  ptId: findingsTable.ptId,
  branchId: findingsTable.branchId,
  branchName: branchesTable.name,
  reportedBy: findingsTable.reportedBy,
  date: findingsTable.date,
  findingText: findingsTable.findingText,
  status: findingsTable.status,
  notes: findingsTable.notes,
  dkAcknowledgedAt: findingsTable.dkAcknowledgedAt,
  dkAcknowledgedBy: findingsTable.dkAcknowledgedBy,
  dkNotes: findingsTable.dkNotes,
  createdAt: findingsTable.createdAt,
  updatedAt: findingsTable.updatedAt,
  closedAt: findingsTable.closedAt,
};

router.get("/findings", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;

  if (user.role === "du") {
    res.status(403).json({ error: "Akses ditolak. DU tidak memiliki akses ke halaman Temuan." });
    return;
  }

  const parsed = ListFindingsQueryParams.safeParse(req.query);

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
    conditions.push(eq(findingsTable.status, status as "pending" | "follow_up" | "completed"));
  }

  const findings = await db
    .select(findingsWithBranch)
    .from(findingsTable)
    .leftJoin(branchesTable, eq(findingsTable.branchId, branchesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(findingsTable.date);
  res.json(findings);
});

router.post("/findings", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;

  if (user.role === "du" || user.role === "owner") {
    res.status(403).json({ error: "Akses ditolak. DU dan Owner tidak bisa membuat temuan." });
    return;
  }

  const parsed = CreateFindingBody.safeParse(req.body);
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

  const [finding] = await db
    .insert(findingsTable)
    .values({
      ptId: parsed.data.ptId,
      branchId: parsed.data.branchId ?? null,
      date: dateStr,
      findingText: parsed.data.findingText,
      status: parsed.data.status as "pending" | "follow_up" | "completed",
      notes: parsed.data.notes ?? null,
      reportedBy: user.id,
    })
    .returning();

  const [withBranch] = await db
    .select(findingsWithBranch)
    .from(findingsTable)
    .leftJoin(branchesTable, eq(findingsTable.branchId, branchesTable.id))
    .where(eq(findingsTable.id, finding.id));

  res.status(201).json(withBranch);
});

router.put("/findings/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;

  if (user.role === "du" || user.role === "owner") {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateFindingParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateFindingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(findingsTable).where(eq(findingsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Temuan tidak ditemukan." });
    return;
  }

  if (user.ptId && existing.ptId !== user.ptId) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  await db
    .update(findingsTable)
    .set({
      ...(parsed.data.findingText !== undefined ? { findingText: parsed.data.findingText } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status as "pending" | "follow_up" | "completed" } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes ?? null } : {}),
    })
    .where(eq(findingsTable.id, params.data.id));

  const [withBranch] = await db
    .select(findingsWithBranch)
    .from(findingsTable)
    .leftJoin(branchesTable, eq(findingsTable.branchId, branchesTable.id))
    .where(eq(findingsTable.id, params.data.id));

  res.json(withBranch);
});

router.patch("/findings/:id/complete", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = CompleteFindingParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(findingsTable).where(eq(findingsTable.id, params.data.id));
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
    .where(eq(findingsTable.id, params.data.id));

  const [withBranch] = await db
    .select(findingsWithBranch)
    .from(findingsTable)
    .leftJoin(branchesTable, eq(findingsTable.branchId, branchesTable.id))
    .where(eq(findingsTable.id, params.data.id));

  res.json(withBranch);
});

router.post("/findings/:id/acknowledge", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;

  if (user.role !== "dk" && user.role !== "superadmin") {
    res.status(403).json({ error: "Akses ditolak. Hanya DK yang bisa mengakui temuan." });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = FindingIdSchema.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: "ID tidak valid." });
    return;
  }

  const parsed = AcknowledgeFindingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid." });
    return;
  }

  const [existing] = await db.select().from(findingsTable).where(eq(findingsTable.id, params.data.id));
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
    .where(eq(findingsTable.id, params.data.id));

  const [withBranch] = await db
    .select(findingsWithBranch)
    .from(findingsTable)
    .leftJoin(branchesTable, eq(findingsTable.branchId, branchesTable.id))
    .where(eq(findingsTable.id, params.data.id));

  res.json(withBranch);
});

export default router;
