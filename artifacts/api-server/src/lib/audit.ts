import { Request } from "express";
import { db, auditLogsTable } from "@workspace/db";

export async function logAudit(
  action: string,
  resourceType: string,
  resourceId: string | null | undefined,
  req: Request,
  options?: {
    ptId?: string | null;
    beforeData?: unknown;
    afterData?: unknown;
  }
): Promise<void> {
  try {
    const user = req.session?.user;
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket?.remoteAddress ?? null;
    await db.insert(auditLogsTable).values({
      userId: user?.id ?? null,
      action,
      resourceType,
      resourceId: resourceId ?? null,
      ptId: options?.ptId ?? null,
      beforeData: options?.beforeData ?? null,
      afterData: options?.afterData ?? null,
      ipAddress: ip,
    });
  } catch {
    // Audit logging should never break the main flow
  }
}
