import { Router, type IRouter } from "express";
import { eq, and, gte, lte, SQL } from "drizzle-orm";
import { db, auditLogsTable, usersTable } from "@workspace/db";
import { requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/audit-logs", requireRole("superadmin"), async (req, res): Promise<void> => {
  const ptId = req.query.ptId as string | undefined;
  const userId = req.query.userId as string | undefined;
  const action = req.query.action as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  const conditions: SQL[] = [];
  if (ptId) conditions.push(eq(auditLogsTable.ptId, ptId));
  if (userId) conditions.push(eq(auditLogsTable.userId, userId));
  if (action) conditions.push(eq(auditLogsTable.action, action));
  if (startDate) conditions.push(gte(auditLogsTable.createdAt, new Date(startDate)));
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(auditLogsTable.createdAt, end));
  }

  const logs = await db
    .select({
      id: auditLogsTable.id,
      userId: auditLogsTable.userId,
      userName: usersTable.name,
      action: auditLogsTable.action,
      resourceType: auditLogsTable.resourceType,
      resourceId: auditLogsTable.resourceId,
      ptId: auditLogsTable.ptId,
      beforeData: auditLogsTable.beforeData,
      afterData: auditLogsTable.afterData,
      ipAddress: auditLogsTable.ipAddress,
      createdAt: auditLogsTable.createdAt,
    })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(auditLogsTable.createdAt)
    .limit(500);

  res.json(logs);
});

export default router;
