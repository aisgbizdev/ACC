import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, findingsTable } from "@workspace/db";
import {
  CreateFindingBody,
  UpdateFindingBody,
  ListFindingsQueryParams,
  UpdateFindingParams,
  CompleteFindingParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/findings", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  const parsed = ListFindingsQueryParams.safeParse(req.query);

  let ptId = parsed.success ? parsed.data.ptId : undefined;
  const status = parsed.success ? parsed.data.status : undefined;

  if (user.role === "apuppt") {
    ptId = user.ptId ?? undefined;
  }

  let query = db.select().from(findingsTable).$dynamic();

  if (ptId) {
    query = query.where(eq(findingsTable.ptId, ptId));
  }
  if (status) {
    query = query.where(eq(findingsTable.status, status as "pending" | "follow_up" | "completed"));
  }

  const findings = await query.orderBy(findingsTable.date);
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

  if (user.role === "apuppt" && parsed.data.ptId !== user.ptId) {
    res.status(403).json({ error: "Anda hanya bisa membuat temuan untuk PT Anda sendiri." });
    return;
  }

  const [finding] = await db
    .insert(findingsTable)
    .values({
      ...parsed.data,
      reportedBy: user.id,
    })
    .returning();

  res.status(201).json(finding);
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

  if (user.role === "apuppt" && existing.ptId !== user.ptId) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  const [updated] = await db
    .update(findingsTable)
    .set(parsed.data)
    .where(eq(findingsTable.id, params.data.id))
    .returning();

  res.json(updated);
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

  if (user.role === "apuppt" && existing.ptId !== user.ptId) {
    res.status(403).json({ error: "Anda hanya bisa menyelesaikan temuan PT Anda sendiri." });
    return;
  }

  const [updated] = await db
    .update(findingsTable)
    .set({ status: "completed", closedAt: new Date() })
    .where(eq(findingsTable.id, params.data.id))
    .returning();

  res.json(updated);
});

export default router;
