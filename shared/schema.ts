import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const members = pgTable("members", {
  callsign: text("callsign").primaryKey(),
  activeYn: boolean("active_yn").notNull().default(true),
  aliases: text("aliases").default(""),
});

export const rawLogs = pgTable("raw_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  submissionId: integer("submission_id").unique(),
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  seasonYear: integer("season_year").notNull(),
  contestKey: text("contest_key").notNull(),
  mode: text("mode").notNull(),
  callsign: text("callsign").notNull(),
  categoryOperator: text("category_operator"),
  claimedScore: integer("claimed_score").notNull(),
  operatorList: text("operator_list"),
  memberOperators: text("member_operators"),
  effectiveOperators: integer("effective_operators").notNull(),
  club: text("club"),
  status: text("status").notNull(),
  rejectReason: text("reject_reason"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

export const baselines = pgTable("baselines", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  seasonYear: integer("season_year").notNull(),
  contestKey: text("contest_key").notNull(),
  mode: text("mode").notNull(),
  highestSingleClaimed: integer("highest_single_claimed"),
}, (table) => ({
  uniqueKey: sql`UNIQUE (${table.seasonYear}, ${table.contestKey}, ${table.mode})`,
}));

export const operatorPoints = pgTable("operator_points", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  submissionId: integer("submission_id").notNull(),
  memberCallsign: text("member_callsign").notNull(),
  individualClaimed: integer("individual_claimed").notNull(),
  normalizedPoints: real("normalized_points").notNull(),
});

export const insertMemberSchema = createInsertSchema(members);
export const insertSubmissionSchema = createInsertSchema(submissions, {
  submittedAt: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
}).omit({ 
  id: true,
});
export const insertRawLogSchema = createInsertSchema(rawLogs, {
  receivedAt: z.coerce.date().optional(),
}).omit({ 
  id: true,
});
export const insertBaselineSchema = createInsertSchema(baselines);
export const insertOperatorPointsSchema = createInsertSchema(operatorPoints).omit({ 
  id: true,
});

export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type RawLog = typeof rawLogs.$inferSelect;
export type InsertRawLog = z.infer<typeof insertRawLogSchema>;
export type Baseline = typeof baselines.$inferSelect;
export type InsertBaseline = z.infer<typeof insertBaselineSchema>;
export type OperatorPoints = typeof operatorPoints.$inferSelect;
export type InsertOperatorPoints = z.infer<typeof insertOperatorPointsSchema>;
