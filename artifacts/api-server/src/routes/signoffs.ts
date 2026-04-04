import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, reportSignoffsTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { logAudit } from "../lib/audit";
import { z } from "zod";

const router: IRouter = Router();

const SignoffBody = z.object({
  ptId: z.string().uuid(),
  periodType: z.enum(["weekly", "monthly"]),
  periodStart: z.string(),
  periodEnd: z.string(),
  notes: z.string().optional().nullable(),
});

router.get("/reports/signoff", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;

  if (user.role !== "du" && user.role !== "superadmin" && user.role !== "dk" && user.role !== "owner") {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  let ptId = req.query.ptId as string | undefined;
  const periodType = req.query.periodType as string | undefined;

  if (user.ptId) {
    ptId = user.ptId;
  }

  const conditions = [];
  if (ptId) conditions.push(eq(reportSignoffsTable.ptId, ptId));
  if (periodType && (periodType === "weekly" || periodType === "monthly")) {
    conditions.push(eq(reportSignoffsTable.periodType, periodType));
  }

  const rows = await db
    .select({
      id: reportSignoffsTable.id,
      ptId: reportSignoffsTable.ptId,
      periodType: reportSignoffsTable.periodType,
      periodStart: reportSignoffsTable.periodStart,
      periodEnd: reportSignoffsTable.periodEnd,
      signedOffBy: reportSignoffsTable.signedOffBy,
      signerName: usersTable.name,
      signedOffAt: reportSignoffsTable.signedOffAt,
      notes: reportSignoffsTable.notes,
    })
    .from(reportSignoffsTable)
    .leftJoin(usersTable, eq(reportSignoffsTable.signedOffBy, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(reportSignoffsTable.periodStart);

  res.json(rows);
});

router.post("/reports/signoff", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  if (user.role !== "du" && user.role !== "superadmin") {
    res.status(403).json({ error: "Hanya DU yang bisa melakukan sign-off laporan." });
    return;
  }

  const parsed = SignoffBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid.", detail: parsed.error.flatten() });
    return;
  }

  const { ptId, periodType, periodStart, periodEnd, notes } = parsed.data;

  if (user.ptId && user.ptId !== ptId) {
    res.status(403).json({ error: "Anda hanya bisa sign-off laporan PT Anda sendiri." });
    return;
  }

  // Check if already signed off for this period
  const [existing] = await db
    .select()
    .from(reportSignoffsTable)
    .where(
      and(
        eq(reportSignoffsTable.ptId, ptId),
        eq(reportSignoffsTable.periodType, periodType),
        eq(reportSignoffsTable.periodStart, periodStart),
        eq(reportSignoffsTable.periodEnd, periodEnd)
      )
    );

  if (existing) {
    res.status(409).json({ error: "Laporan periode ini sudah pernah di-sign-off." });
    return;
  }

  const [signoff] = await db
    .insert(reportSignoffsTable)
    .values({
      ptId,
      periodType,
      periodStart,
      periodEnd,
      signedOffBy: user.id,
      notes: notes ?? null,
    })
    .returning();

  await logAudit("du_signoff", "report_signoff", signoff.id, req, {
    ptId,
    afterData: { ptId, periodType, periodStart, periodEnd },
  });

  const [withSigner] = await db
    .select({
      id: reportSignoffsTable.id,
      ptId: reportSignoffsTable.ptId,
      periodType: reportSignoffsTable.periodType,
      periodStart: reportSignoffsTable.periodStart,
      periodEnd: reportSignoffsTable.periodEnd,
      signedOffBy: reportSignoffsTable.signedOffBy,
      signerName: usersTable.name,
      signedOffAt: reportSignoffsTable.signedOffAt,
      notes: reportSignoffsTable.notes,
    })
    .from(reportSignoffsTable)
    .leftJoin(usersTable, eq(reportSignoffsTable.signedOffBy, usersTable.id))
    .where(eq(reportSignoffsTable.id, signoff.id));

  res.status(201).json(withSigner);
});

export default router;
