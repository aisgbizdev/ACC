import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { dailyActivitiesTable } from "./daily_activities";
import { usersTable } from "./users";

export const activityCommentsTable = pgTable("activity_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  activityId: uuid("activity_id").notNull().references(() => dailyActivitiesTable.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => usersTable.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ActivityComment = typeof activityCommentsTable.$inferSelect;
