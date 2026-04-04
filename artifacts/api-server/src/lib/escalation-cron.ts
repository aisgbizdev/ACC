import { eq, and, isNull, lte } from "drizzle-orm";
import { db, findingsTable, ticketCommentsTable, auditLogsTable } from "@workspace/db";
import { logger } from "./logger";

export async function runEscalationCheck(): Promise<void> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  logger.info("Running escalation check...");

  try {
    // Level 0 → 1: tickets past deadline that haven't been escalated yet (any open status)
    const level0Overdue = await db
      .select()
      .from(findingsTable)
      .where(
        and(
          eq(findingsTable.escalationLevel, 0),
          isNull(findingsTable.closedAt),
          lte(findingsTable.deadline, todayStr)
        )
      );

    for (const ticket of level0Overdue) {
      const now = new Date();
      await db
        .update(findingsTable)
        .set({ escalationLevel: 1, escalatedAt: now })
        .where(eq(findingsTable.id, ticket.id));

      // System comment notification visible in ticket thread to DK
      await db.insert(ticketCommentsTable).values({
        findingId: ticket.id,
        authorId: null,
        content: `Tiket ini telah di-eskalasi ke Level 1 (DK) karena melewati deadline dan belum diselesaikan. Mohon segera ditindaklanjuti.`,
        isSystemLog: true,
      });

      // Audit log entry for escalation
      await db.insert(auditLogsTable).values({
        userId: null,
        action: "escalate_ticket",
        resourceType: "finding",
        resourceId: ticket.id,
        ptId: ticket.ptId,
        afterData: { escalationLevel: 1, reason: "deadline_exceeded" },
        ipAddress: "system",
      });

      logger.info({ ticketId: ticket.id, ptId: ticket.ptId }, "Escalated to level 1 (DK notified via ticket comment)");
    }

    // Level 1 → 2: tickets already at level 1 and still open 3 days after escalation (any open status)
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const level1Stale = await db
      .select()
      .from(findingsTable)
      .where(
        and(
          eq(findingsTable.escalationLevel, 1),
          isNull(findingsTable.closedAt),
          lte(findingsTable.escalatedAt, threeDaysAgo)
        )
      );

    for (const ticket of level1Stale) {
      await db
        .update(findingsTable)
        .set({ escalationLevel: 2 })
        .where(eq(findingsTable.id, ticket.id));

      // System comment notification visible in ticket thread to Owner/Superadmin
      await db.insert(ticketCommentsTable).values({
        findingId: ticket.id,
        authorId: null,
        content: `Tiket ini telah di-eskalasi ke Level 2 (Owner/Superadmin) karena sudah 3 hari sejak eskalasi Level 1 dan belum ada tindak lanjut. Diperlukan perhatian segera.`,
        isSystemLog: true,
      });

      // Audit log entry for escalation
      await db.insert(auditLogsTable).values({
        userId: null,
        action: "escalate_ticket",
        resourceType: "finding",
        resourceId: ticket.id,
        ptId: ticket.ptId,
        afterData: { escalationLevel: 2, reason: "unresolved_3_days_after_level1" },
        ipAddress: "system",
      });

      logger.info({ ticketId: ticket.id, ptId: ticket.ptId }, "Escalated to level 2 (Owner/Superadmin notified via ticket comment)");
    }

    logger.info(
      { level0Count: level0Overdue.length, level1Count: level1Stale.length },
      "Escalation check complete"
    );
  } catch (err) {
    logger.error({ err }, "Escalation check failed");
  }
}

export function scheduleEscalation(): void {
  // Run once at startup after a short delay
  setTimeout(runEscalationCheck, 5000);

  // Then run daily at 08:00 WIB (UTC+7 = 01:00 UTC)
  const runAt0800WIB = () => {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setUTCHours(1, 0, 0, 0);
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    const msUntilNextRun = nextRun.getTime() - now.getTime();
    setTimeout(() => {
      runEscalationCheck();
      setInterval(runEscalationCheck, 24 * 60 * 60 * 1000);
    }, msUntilNextRun);
  };

  runAt0800WIB();
}
