import { pgTable, uuid, varchar, timestamp, date, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ptsTable } from "./pts";
import { usersTable } from "./users";
import { branchesTable } from "./branches";

export const findingRecordStatusEnum = pgEnum("finding_record_status", ["pending", "follow_up", "completed"]);

export const findingsTable = pgTable("findings", {
  id: uuid("id").primaryKey().defaultRandom(),
  ptId: uuid("pt_id").notNull().references(() => ptsTable.id),
  branchId: uuid("branch_id").references(() => branchesTable.id),
  reportedBy: uuid("reported_by").notNull().references(() => usersTable.id),
  date: date("date").notNull(),
  findingText: text("finding_text").notNull(),
  status: findingRecordStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export const insertFindingSchema = createInsertSchema(findingsTable).omit({ id: true, createdAt: true, updatedAt: true, closedAt: true });
export type InsertFinding = z.infer<typeof insertFindingSchema>;
export type Finding = typeof findingsTable.$inferSelect;
