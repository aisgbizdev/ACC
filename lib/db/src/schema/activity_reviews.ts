import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { dailyActivitiesTable } from "./daily_activities";
import { usersTable } from "./users";

export const activityReviewsTable = pgTable("activity_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  activityId: uuid("activity_id").notNull().references(() => dailyActivitiesTable.id),
  reviewedBy: uuid("reviewed_by").notNull().references(() => usersTable.id),
  reviewNotes: text("review_notes"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ActivityReview = typeof activityReviewsTable.$inferSelect;
