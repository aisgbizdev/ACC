import { pgTable, uuid, text, timestamp, date, pgEnum } from "drizzle-orm/pg-core";
import { ptsTable } from "./pts";
import { usersTable } from "./users";

export const periodTypeEnum = pgEnum("period_type", ["weekly", "monthly"]);

export const reportSignoffsTable = pgTable("report_signoffs", {
  id: uuid("id").primaryKey().defaultRandom(),
  ptId: uuid("pt_id").notNull().references(() => ptsTable.id),
  periodType: periodTypeEnum("period_type").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  signedOffBy: uuid("signed_off_by").notNull().references(() => usersTable.id),
  signedOffAt: timestamp("signed_off_at", { withTimezone: true }).notNull().defaultNow(),
  notes: text("notes"),
});

export type ReportSignoff = typeof reportSignoffsTable.$inferSelect;
