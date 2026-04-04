import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ptsTable = pgTable("pts", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPtSchema = createInsertSchema(ptsTable).omit({ id: true, createdAt: true });
export type InsertPt = z.infer<typeof insertPtSchema>;
export type Pt = typeof ptsTable.$inferSelect;
