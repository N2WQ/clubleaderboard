import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, real, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const members = pgTable("members", {
  callsign: text("callsign").primaryKey(),
  activeYn: boolean("active_yn").notNull().default(true),
  aliases: text("aliases").default(""),
  firstName: text("first_name"),
  lastName: text("last_name"),
  duesExpiration: text("dues_expiration"),
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
  contestYear: integer("contest_year").notNull().default(2025),
  contestKey: text("contest_key").notNull(),
  mode: text("mode").notNull(),
  callsign: text("callsign").notNull(),
  categoryOperator: text("category_operator"),
  claimedScore: integer("claimed_score").notNull(),
  operatorList: text("operator_list"),
  memberOperators: text("member_operators"),
  totalOperators: integer("total_operators").notNull().default(1),
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
  highestSingleClaimed: integer("highest_single_claimed"),
}, (table) => ({
  uniqueKey: unique().on(table.seasonYear, table.contestKey),
}));

export const operatorPoints = pgTable("operator_points", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  submissionId: integer("submission_id").notNull(),
  memberCallsign: text("member_callsign").notNull(),
  individualClaimed: real("individual_claimed").notNull(),
  normalizedPoints: real("normalized_points").notNull(),
});

export const scoringConfig = pgTable("scoring_config", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMemberSchema = createInsertSchema(members);
export const insertSubmissionSchema = z.object({
  seasonYear: z.number(),
  contestYear: z.number(),
  contestKey: z.string(),
  mode: z.string(),
  callsign: z.string(),
  categoryOperator: z.string().optional(),
  claimedScore: z.number(),
  operatorList: z.string().optional(),
  memberOperators: z.string().optional(),
  totalOperators: z.number(),
  effectiveOperators: z.number(),
  club: z.string().optional(),
  status: z.string(),
  rejectReason: z.string().optional(),
});
export const insertRawLogSchema = z.object({
  submissionId: z.number().optional(),
  filename: z.string(),
  content: z.string(),
});
export const insertBaselineSchema = z.object({
  seasonYear: z.number(),
  contestKey: z.string(),
  highestSingleClaimed: z.number().optional(),
});
export const insertOperatorPointsSchema = z.object({
  submissionId: z.number(),
  memberCallsign: z.string(),
  individualClaimed: z.number(),
  normalizedPoints: z.number(),
});
export const insertScoringConfigSchema = z.object({
  key: z.string(),
  value: z.string(),
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
export type ScoringConfig = typeof scoringConfig.$inferSelect;
export type InsertScoringConfig = z.infer<typeof insertScoringConfigSchema>;
