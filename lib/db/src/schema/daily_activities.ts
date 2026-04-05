import { pgTable, uuid, varchar, timestamp, date, integer, boolean, text, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ptsTable } from "./pts";
import { usersTable } from "./users";
import { branchesTable } from "./branches";

export const ACTIVITY_TYPES = ["kyc", "cdd", "screening", "monitoring_transaksi", "pelaporan", "sosialisasi", "lainnya", "libur"] as const;
export type ActivityType = typeof ACTIVITY_TYPES[number];

export const CUSTOMER_RISK_CATEGORIES = ["high", "medium", "low"] as const;
export type CustomerRiskCategory = typeof CUSTOMER_RISK_CATEGORIES[number];

export const dailyActivitiesTable = pgTable(
  "daily_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ptId: uuid("pt_id").notNull().references(() => ptsTable.id),
    userId: uuid("user_id").notNull().references(() => usersTable.id),
    branchId: uuid("branch_id").references(() => branchesTable.id),
    date: date("date").notNull(),
    activityType: varchar("activity_type", { length: 50 }).notNull(),
    itemsReviewed: integer("items_reviewed").notNull().default(0),
    customerRiskCategories: jsonb("customer_risk_categories").$type<string[]>(),
    hasFinding: boolean("has_finding").notNull().default(false),
    findingSummary: text("finding_summary"),
    findingStatus: varchar("finding_status", { length: 20 }),
    notes: text("notes"),
    // DK Review
    dkReviewedAt: timestamp("dk_reviewed_at", { withTimezone: true }),
    dkReviewedBy: uuid("dk_reviewed_by").references(() => usersTable.id),
    dkNotes: text("dk_notes"),
    // DU Sign-off
    duSignedOffAt: timestamp("du_signed_off_at", { withTimezone: true }),
    duSignedOffBy: uuid("du_signed_off_by").references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
);

export const insertDailyActivitySchema = createInsertSchema(dailyActivitiesTable, {
  activityType: z.enum(ACTIVITY_TYPES),
  customerRiskCategories: z.array(z.enum(CUSTOMER_RISK_CATEGORIES)).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true, dkReviewedAt: true, dkReviewedBy: true, dkNotes: true, duSignedOffAt: true, duSignedOffBy: true });
export type InsertDailyActivity = z.infer<typeof insertDailyActivitySchema>;
export type DailyActivity = typeof dailyActivitiesTable.$inferSelect;
