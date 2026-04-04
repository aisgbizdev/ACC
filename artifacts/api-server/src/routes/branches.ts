import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, branchesTable, ptsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const BRANCH_SELECT = {
  id: branchesTable.id,
  name: branchesTable.name,
  notes: branchesTable.notes,
  ptId: branchesTable.ptId,
  ptCode: ptsTable.code,
  ptName: ptsTable.name,
  createdAt: branchesTable.createdAt,
};

router.get("/branches", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  const { ptId } = req.query;

  let branches;

  if (user.ptId) {
    branches = await db
      .select(BRANCH_SELECT)
      .from(branchesTable)
      .innerJoin(ptsTable, eq(branchesTable.ptId, ptsTable.id))
      .where(eq(branchesTable.ptId, user.ptId))
      .orderBy(branchesTable.name);
  } else if (ptId && typeof ptId === "string") {
    branches = await db
      .select(BRANCH_SELECT)
      .from(branchesTable)
      .innerJoin(ptsTable, eq(branchesTable.ptId, ptsTable.id))
      .where(eq(branchesTable.ptId, ptId))
      .orderBy(branchesTable.name);
  } else {
    branches = await db
      .select(BRANCH_SELECT)
      .from(branchesTable)
      .innerJoin(ptsTable, eq(branchesTable.ptId, ptsTable.id))
      .orderBy(ptsTable.code, branchesTable.name);
  }

  res.json(branches);
});

export default router;
