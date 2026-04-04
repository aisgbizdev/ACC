import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { findingsTable } from "./findings";
import { usersTable } from "./users";

export const ticketCommentsTable = pgTable("ticket_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  findingId: uuid("finding_id").notNull().references(() => findingsTable.id),
  authorId: uuid("author_id").references(() => usersTable.id),
  content: text("content").notNull(),
  isSystemLog: boolean("is_system_log").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TicketComment = typeof ticketCommentsTable.$inferSelect;
