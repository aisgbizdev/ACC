import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, activityReviewsTable, dailyActivitiesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { logAudit } from "../lib/audit";
import { z } from "zod";

const router: IRouter = Router();

const ReviewBody = z.object({
  reviewNotes: z.string().optional().nullable(),
});

router.get("/activities/:id/review", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  if (user.role !== "dk" && user.role !== "superadmin") {
    res.status(403).json({ error: "Hanya DK yang bisa melihat tinjauan." });
    return;
  }

  const activityId = req.params.id as string;

  // Verify activity exists and enforce PT scope
  const [activity] = await db
    .select({ ptId: dailyActivitiesTable.ptId })
    .from(dailyActivitiesTable)
    .where(eq(dailyActivitiesTable.id, activityId));

  if (!activity) {
    res.status(404).json({ error: "Aktivitas tidak ditemukan." });
    return;
  }

  if (user.ptId && activity.ptId !== user.ptId) {
    res.status(403).json({ error: "Akses ditolak." });
    return;
  }

  const [review] = await db
    .select({
      id: activityReviewsTable.id,
      activityId: activityReviewsTable.activityId,
      reviewedBy: activityReviewsTable.reviewedBy,
      reviewerName: usersTable.name,
      reviewNotes: activityReviewsTable.reviewNotes,
      reviewedAt: activityReviewsTable.reviewedAt,
    })
    .from(activityReviewsTable)
    .leftJoin(usersTable, eq(activityReviewsTable.reviewedBy, usersTable.id))
    .where(eq(activityReviewsTable.activityId, activityId));

  res.json(review ?? null);
});

router.post("/activities/:id/review", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  if (user.role !== "dk" && user.role !== "superadmin") {
    res.status(403).json({ error: "Hanya DK yang bisa meninjau aktivitas." });
    return;
  }

  const activityId = req.params.id as string;

  const [activity] = await db
    .select()
    .from(dailyActivitiesTable)
    .where(eq(dailyActivitiesTable.id, activityId));

  if (!activity) {
    res.status(404).json({ error: "Aktivitas tidak ditemukan." });
    return;
  }

  if (user.ptId && activity.ptId !== user.ptId) {
    res.status(403).json({ error: "Anda hanya bisa meninjau aktivitas PT Anda sendiri." });
    return;
  }

  const parsed = ReviewBody.safeParse(req.body);
  const reviewNotes = parsed.success ? (parsed.data.reviewNotes ?? null) : null;

  // Upsert: delete old review if exists, then insert new one
  await db.delete(activityReviewsTable).where(eq(activityReviewsTable.activityId, activityId));

  const [review] = await db
    .insert(activityReviewsTable)
    .values({
      activityId,
      reviewedBy: user.id,
      reviewNotes,
    })
    .returning();

  await logAudit("dk_review", "activity", activityId, req, {
    ptId: activity.ptId,
    afterData: { reviewNotes },
  });

  const [withReviewer] = await db
    .select({
      id: activityReviewsTable.id,
      activityId: activityReviewsTable.activityId,
      reviewedBy: activityReviewsTable.reviewedBy,
      reviewerName: usersTable.name,
      reviewNotes: activityReviewsTable.reviewNotes,
      reviewedAt: activityReviewsTable.reviewedAt,
    })
    .from(activityReviewsTable)
    .leftJoin(usersTable, eq(activityReviewsTable.reviewedBy, usersTable.id))
    .where(eq(activityReviewsTable.id, review.id));

  res.status(201).json(withReviewer);
});

export default router;
