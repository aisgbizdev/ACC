import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { db, pushSubscriptionsTable, usersTable } from "@workspace/db";
import { logger } from "./logger";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? "mailto:admin@example.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  logger.warn("VAPID keys not configured — push notifications disabled");
}

export function isWebPushConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

async function sendToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!isWebPushConfigured()) return;

  const subscriptions = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.userId, userId));

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 410 || status === 404) {
        await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.id, sub.id));
        logger.info({ subscriptionId: sub.id }, "Removed expired push subscription");
      } else {
        logger.warn({ err, subscriptionId: sub.id }, "Failed to send push notification");
      }
    }
  }
}

async function sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  for (const userId of userIds) {
    await sendToUser(userId, payload);
  }
}

async function getUsersByRole(roles: string[], ptId?: string): Promise<string[]> {
  const conditions = [inArray(usersTable.role, roles as ("apuppt" | "dk" | "du" | "owner" | "superadmin")[])];

  const users = await db
    .select({ id: usersTable.id, ptId: usersTable.ptId })
    .from(usersTable)
    .where(conditions.length === 1 ? conditions[0] : undefined);

  return users
    .filter((u) => {
      if (!ptId) return true;
      if (roles.includes("owner") || roles.includes("superadmin")) {
        if (!u.ptId) return true;
      }
      return u.ptId === ptId;
    })
    .map((u) => u.id);
}

export async function notifyNewFinding(ptId: string, findingText: string, reportedByUserId: string): Promise<void> {
  try {
    const payload: PushPayload = {
      title: "Temuan Baru",
      body: findingText.slice(0, 100),
      url: "/findings",
      tag: `finding-new-${ptId}`,
    };

    const dkIds = await getUsersByRole(["dk"], ptId);
    const globalIds = await getUsersByRole(["owner", "superadmin"]);
    const targetIds = [...new Set([...dkIds, ...globalIds])].filter((id) => id !== reportedByUserId);

    await sendToUsers(targetIds, payload);
  } catch (err) {
    logger.error({ err }, "notifyNewFinding failed");
  }
}

export async function notifyNewComment(findingId: string, ptId: string, commenterUserId: string, content: string): Promise<void> {
  try {
    const payload: PushPayload = {
      title: "Komentar Baru di Tiket",
      body: content.slice(0, 100),
      url: `/findings/${findingId}`,
      tag: `comment-${findingId}`,
    };

    const allPtUsers = await getUsersByRole(["apuppt", "dk"], ptId);
    const globalIds = await getUsersByRole(["owner", "superadmin"]);
    const targetIds = [...new Set([...allPtUsers, ...globalIds])].filter((id) => id !== commenterUserId);

    await sendToUsers(targetIds, payload);
  } catch (err) {
    logger.error({ err }, "notifyNewComment failed");
  }
}

export async function notifyNewActivity(ptId: string, activityType: string, submitterUserId: string): Promise<void> {
  try {
    const payload: PushPayload = {
      title: "Aktivitas Baru Diinput",
      body: `APUPPT telah menginput aktivitas: ${activityType}`,
      url: "/activities",
      tag: `activity-new-${ptId}`,
    };

    const dkIds = await getUsersByRole(["dk"], ptId);
    const duIds = await getUsersByRole(["du"], ptId);
    const globalIds = await getUsersByRole(["owner", "superadmin"]);
    const targetIds = [...new Set([...dkIds, ...duIds, ...globalIds])].filter((id) => id !== submitterUserId);

    await sendToUsers(targetIds, payload);
  } catch (err) {
    logger.error({ err }, "notifyNewActivity failed");
  }
}

export async function notifyDailyMissing(ptId: string, ptName: string): Promise<void> {
  try {
    const payload: PushPayload = {
      title: "PT Belum Update Hari Ini",
      body: `${ptName} belum menginput aktivitas hari ini.`,
      url: "/dashboard",
      tag: `daily-missing-${ptId}`,
    };

    const dkIds = await getUsersByRole(["dk"], ptId);
    const globalIds = await getUsersByRole(["owner", "superadmin"]);
    const targetIds = [...new Set([...dkIds, ...globalIds])];

    await sendToUsers(targetIds, payload);
  } catch (err) {
    logger.error({ err }, "notifyDailyMissing failed");
  }
}

export async function notifyApupptReminder(ptId: string, ptName: string): Promise<void> {
  try {
    const payload: PushPayload = {
      title: "⏰ Pengingat Input Aktivitas",
      body: `Aktivitas hari ini belum diinput. Harap segera isi sebelum jam 17.00 WIB.`,
      url: "/activity",
      tag: `reminder-apuppt-${ptId}`,
    };

    const apupptIds = await getUsersByRole(["apuppt"], ptId);
    await sendToUsers(apupptIds, payload);
  } catch (err) {
    logger.error({ err }, "notifyApupptReminder failed");
  }
}

export async function notifyDailySummary(summary: { totalPts: number; redCount: number; greenCount: number }): Promise<void> {
  try {
    const payload: PushPayload = {
      title: "Ringkasan Harian ACC",
      body: `Total PT: ${summary.totalPts}. Status Merah: ${summary.redCount}. Status Hijau: ${summary.greenCount}.`,
      url: "/dashboard",
      tag: "daily-summary",
    };

    const globalIds = await getUsersByRole(["owner", "superadmin"]);
    await sendToUsers(globalIds, payload);
  } catch (err) {
    logger.error({ err }, "notifyDailySummary failed");
  }
}

export async function notifyDuApprovalReminder(ptId: string, ptName: string, dueDateLabel: string): Promise<void> {
  try {
    const payload: PushPayload = {
      title: "Pengingat Approval DU (H-1)",
      body: `${ptName}: masih ada laporan menunggu approval DU. Deadline ${dueDateLabel} pukul 12.00 WIB.`,
      url: "/signoff",
      tag: `du-approval-reminder-${ptId}`,
    };

    const duIds = await getUsersByRole(["du"], ptId);
    await sendToUsers(duIds, payload);
  } catch (err) {
    logger.error({ err }, "notifyDuApprovalReminder failed");
  }
}
