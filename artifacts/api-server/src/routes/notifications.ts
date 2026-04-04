import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { isWebPushConfigured } from "../lib/push-notify";

const router: IRouter = Router();

const SubscribeBody = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

router.get("/notifications/vapid-public-key", (_req, res): void => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key || !isWebPushConfigured()) {
    res.status(503).json({ error: "Push notifications not configured." });
    return;
  }
  res.json({ publicKey: key });
});

router.post("/notifications/subscribe", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;

  if (!isWebPushConfigured()) {
    res.status(503).json({ error: "Push notifications not configured." });
    return;
  }

  const parsed = SubscribeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data subscription tidak valid.", detail: parsed.error.flatten() });
    return;
  }

  const { endpoint, keys } = parsed.data;

  const [existing] = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(
      and(
        eq(pushSubscriptionsTable.userId, user.id),
        eq(pushSubscriptionsTable.endpoint, endpoint)
      )
    );

  if (existing) {
    res.json({ message: "Subscription sudah terdaftar." });
    return;
  }

  await db.insert(pushSubscriptionsTable).values({
    userId: user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  });

  res.status(201).json({ message: "Subscription berhasil disimpan." });
});

router.delete("/notifications/subscribe", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;

  const EndpointBody = z.object({ endpoint: z.string() });
  const parsed = EndpointBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Endpoint tidak valid." });
    return;
  }

  await db
    .delete(pushSubscriptionsTable)
    .where(
      and(
        eq(pushSubscriptionsTable.userId, user.id),
        eq(pushSubscriptionsTable.endpoint, parsed.data.endpoint)
      )
    );

  res.json({ message: "Subscription berhasil dihapus." });
});

router.get("/notifications/status", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;

  const subs = await db
    .select({ id: pushSubscriptionsTable.id })
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.userId, user.id));

  res.json({ subscribed: subs.length > 0, count: subs.length });
});

export default router;
