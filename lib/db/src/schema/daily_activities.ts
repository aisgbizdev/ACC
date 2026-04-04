import { pgTable, uuid, varchar, timestamp, date, integer, boolean, text, pgEnum, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ptsTable } from "./pts";
import { usersTable } from "./users";

export const activityTypeEnum = pgEnum("activity_type", [
  "transaction_review",
  "kyc_document_review",
  "branch_follow_up",
  "transaction_analysis",
  "source_of_fund_verification",
  "report_preparation",
  "meeting_coordination",
  "apuppt_socialization",
]);

export const findingStatusEnum = pgEnum("finding_status", ["pending", "follow_up", "completed"]);

export const dailyActivitiesTable = pgTable(
  "daily_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ptId: uuid("pt_id").notNull().references(() => ptsTable.id),
    userId: uuid("user_id").notNull().references(() => usersTable.id),
    date: date("date").notNull(),
    activityType: activityTypeEnum("activity_type").notNull(),
    itemsReviewed: integer("items_reviewed").notNull().default(0),
    hasFinding: boolean("has_finding").notNull().default(false),
    findingSummary: text("finding_summary"),
    findingStatus: findingStatusEnum("finding_status"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [unique("daily_activities_pt_date_unique").on(table.ptId, table.date)],
);

export const insertDailyActivitySchema = createInsertSchema(dailyActivitiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDailyActivity = z.infer<typeof insertDailyActivitySchema>;
export type DailyActivity = typeof dailyActivitiesTable.$inferSelect;
