import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, activityReviewsTable, dailyActivitiesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

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
  res.status(403).json({ error: "Role DK bersifat monitoring-only. Approval formal dilakukan oleh DU." });
});

export default router;
