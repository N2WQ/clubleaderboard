import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, desc, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import type {
  Member,
  InsertMember,
  Submission,
  InsertSubmission,
  RawLog,
  InsertRawLog,
  Baseline,
  InsertBaseline,
  OperatorPoints,
  InsertOperatorPoints,
  ScoringConfig,
  InsertScoringConfig,
} from "@shared/schema";

const client = neon(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });

export interface IStorage {
  getMember(callsign: string): Promise<Member | undefined>;
  getAllActiveMembers(): Promise<Member[]>;
  getEligibleMembers(seasonYear: number): Promise<Member[]>;
  createMember(member: InsertMember): Promise<Member>;
  createManyMembers(members: InsertMember[]): Promise<void>;
  deleteAllMembers(): Promise<void>;

  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmission(id: number): Promise<Submission | undefined>;
  getActiveSubmissionsByContest(seasonYear: number, contestKey: string): Promise<Submission[]>;
  deactivateSubmission(callsign: string, contestKey: string, seasonYear: number): Promise<void>;
  getSeasonLeaderboard(seasonYear: number): Promise<any[]>;
  getAllTimeLeaderboard(): Promise<any[]>;
  getAvailableYears(): Promise<number[]>;
  getMemberContestHistory(callsign: string, seasonYear: number): Promise<any[]>;
  getContestResults(contestKey: string, seasonYear: number): Promise<any[]>;
  getAllSubmissions(seasonYear: number | undefined, memberCallsign?: string): Promise<any[]>;
  getSeasonStats(seasonYear: number): Promise<any>;
  getMostCompetitiveContests(limit: number): Promise<any[]>;
  getMostActiveOperators(limit: number): Promise<any[]>;

  createRawLog(log: InsertRawLog): Promise<RawLog>;

  getBaseline(seasonYear: number, contestKey: string): Promise<Baseline | undefined>;
  upsertBaseline(baseline: InsertBaseline): Promise<void>;

  createOperatorPoints(points: InsertOperatorPoints): Promise<OperatorPoints>;
  deleteOperatorPointsBySubmission(submissionId: number): Promise<void>;
  clearAllContestData(): Promise<void>;

  getScoringConfig(key: string): Promise<ScoringConfig | undefined>;
  setScoringConfig(config: InsertScoringConfig): Promise<void>;
  getAllUniqueContests(): Promise<Array<{ contestYear: number; contestKey: string; submissionCount: number }>>;
}

export class DbStorage implements IStorage {
  async getMember(callsign: string): Promise<Member | undefined> {
    const result = await db.select().from(schema.members).where(eq(schema.members.callsign, callsign)).limit(1);
    return result[0];
  }

  async getAllActiveMembers(): Promise<Member[]> {
    return db.select().from(schema.members).where(eq(schema.members.activeYn, true));
  }

  async getEligibleMembers(seasonYear: number): Promise<Member[]> {
    const cutoffDate = `12/31/${seasonYear}`;
    return db
      .select()
      .from(schema.members)
      .where(
        and(
          eq(schema.members.activeYn, true),
          sql`${schema.members.duesExpiration} >= ${cutoffDate}`
        )
      )
      .orderBy(schema.members.callsign);
  }

  async createMember(member: InsertMember): Promise<Member> {
    const result = await db.insert(schema.members).values(member).returning();
    return result[0];
  }

  async createManyMembers(members: InsertMember[]): Promise<void> {
    if (members.length > 0) {
      await db.insert(schema.members).values(members).onConflictDoUpdate({
        target: schema.members.callsign,
        set: {
          activeYn: sql`EXCLUDED.active_yn`,
          aliases: sql`EXCLUDED.aliases`,
          firstName: sql`EXCLUDED.first_name`,
          lastName: sql`EXCLUDED.last_name`,
          duesExpiration: sql`EXCLUDED.dues_expiration`,
        },
      });
    }
  }

  async deleteAllMembers(): Promise<void> {
    await db.delete(schema.members);
  }

  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    const result = await db.insert(schema.submissions).values(submission).returning();
    return result[0];
  }

  async getSubmission(id: number): Promise<Submission | undefined> {
    const result = await db.select().from(schema.submissions).where(eq(schema.submissions.id, id)).limit(1);
    return result[0];
  }

  async getActiveSubmissionsByContest(seasonYear: number, contestKey: string): Promise<Submission[]> {
    return db.select().from(schema.submissions).where(
      and(
        eq(schema.submissions.seasonYear, seasonYear),
        eq(schema.submissions.contestKey, contestKey),
        eq(schema.submissions.isActive, true)
      )
    );
  }

  async deactivateSubmission(callsign: string, contestKey: string, seasonYear: number): Promise<void> {
    await db.update(schema.submissions)
      .set({ isActive: false })
      .where(
        and(
          eq(schema.submissions.callsign, callsign),
          eq(schema.submissions.contestKey, contestKey),
          eq(schema.submissions.seasonYear, seasonYear),
          eq(schema.submissions.isActive, true)
        )
      );
  }

  async getSeasonLeaderboard(seasonYear: number): Promise<any[]> {
    const result = await db
      .select({
        callsign: schema.operatorPoints.memberCallsign,
        totalPoints: sql<number>`ROUND(SUM(${schema.operatorPoints.normalizedPoints}))`,
        contests: sql<number>`COUNT(DISTINCT ${schema.submissions.contestKey})`,
        totalClaimed: sql<number>`SUM(${schema.operatorPoints.individualClaimed})`,
      })
      .from(schema.operatorPoints)
      .innerJoin(schema.submissions, eq(schema.operatorPoints.submissionId, schema.submissions.id))
      .where(
        and(
          eq(schema.submissions.seasonYear, seasonYear),
          eq(schema.submissions.status, "accepted")
        )
      )
      .groupBy(schema.operatorPoints.memberCallsign)
      .orderBy(desc(sql`ROUND(SUM(${schema.operatorPoints.normalizedPoints}))`));

    let currentRank = 1;
    let previousPoints: number | null = null;
    
    return result.map((row) => {
      if (previousPoints !== null && row.totalPoints < previousPoints) {
        currentRank++;
      }
      previousPoints = row.totalPoints;
      
      return {
        rank: currentRank,
        callsign: row.callsign,
        normalizedPoints: row.totalPoints,
        contests: row.contests,
        claimedScore: row.totalClaimed,
      };
    });
  }

  async getAllTimeLeaderboard(): Promise<any[]> {
    const result = await db
      .select({
        callsign: schema.operatorPoints.memberCallsign,
        totalPoints: sql<number>`ROUND(SUM(${schema.operatorPoints.normalizedPoints}))`,
        contests: sql<number>`COUNT(DISTINCT ${schema.submissions.seasonYear} || '_' || ${schema.submissions.contestKey})`,
        totalClaimed: sql<number>`SUM(${schema.operatorPoints.individualClaimed})`,
      })
      .from(schema.operatorPoints)
      .innerJoin(schema.submissions, eq(schema.operatorPoints.submissionId, schema.submissions.id))
      .where(eq(schema.submissions.status, "accepted"))
      .groupBy(schema.operatorPoints.memberCallsign)
      .orderBy(desc(sql`ROUND(SUM(${schema.operatorPoints.normalizedPoints}))`));

    let currentRank = 1;
    let previousPoints: number | null = null;
    
    return result.map((row) => {
      if (previousPoints !== null && row.totalPoints < previousPoints) {
        currentRank++;
      }
      previousPoints = row.totalPoints;
      
      return {
        rank: currentRank,
        callsign: row.callsign,
        normalizedPoints: row.totalPoints,
        contests: row.contests,
        claimedScore: row.totalClaimed,
      };
    });
  }

  async getAvailableYears(): Promise<number[]> {
    const result = await db
      .selectDistinct({ year: schema.submissions.contestYear })
      .from(schema.submissions)
      .orderBy(desc(schema.submissions.contestYear));
    
    return result.map(r => r.year);
  }

  async getMemberContestHistory(callsign: string, seasonYear: number): Promise<any[]> {
    return db
      .select({
        contest: schema.submissions.contestKey,
        mode: schema.submissions.mode,
        claimed: schema.operatorPoints.individualClaimed,
        normalized: sql<number>`ROUND(${schema.operatorPoints.normalizedPoints})`,
        date: schema.submissions.submittedAt,
      })
      .from(schema.operatorPoints)
      .innerJoin(schema.submissions, eq(schema.operatorPoints.submissionId, schema.submissions.id))
      .where(
        and(
          eq(schema.operatorPoints.memberCallsign, callsign),
          eq(schema.submissions.seasonYear, seasonYear),
          eq(schema.submissions.status, "accepted")
        )
      )
      .orderBy(desc(schema.submissions.submittedAt));
  }

  async getContestResults(contestKey: string, seasonYear: number): Promise<any[]> {
    const results = await db
      .select({
        contestYear: schema.submissions.contestYear,
        callsign: schema.submissions.callsign,
        mode: schema.submissions.mode,
        claimedScore: schema.submissions.claimedScore,
        totalOperators: schema.submissions.totalOperators,
        effectiveOperators: schema.submissions.effectiveOperators,
        status: schema.submissions.status,
        submittedAt: schema.submissions.submittedAt,
        individualClaimed: sql<number>`MAX(${schema.operatorPoints.individualClaimed})`.as('individualClaimed'),
        normalizedPoints: sql<number>`ROUND(MAX(${schema.operatorPoints.normalizedPoints}))`.as('normalizedPoints'),
      })
      .from(schema.submissions)
      .leftJoin(schema.operatorPoints, eq(schema.submissions.id, schema.operatorPoints.submissionId))
      .where(
        and(
          eq(schema.submissions.contestKey, contestKey),
          eq(schema.submissions.seasonYear, seasonYear),
          eq(schema.submissions.isActive, true)
        )
      )
      .groupBy(
        schema.submissions.id,
        schema.submissions.contestYear,
        schema.submissions.callsign,
        schema.submissions.mode,
        schema.submissions.claimedScore,
        schema.submissions.totalOperators,
        schema.submissions.effectiveOperators,
        schema.submissions.status,
        schema.submissions.submittedAt
      )
      .orderBy(desc(schema.submissions.claimedScore));

    return results.map(r => ({
      ...r,
      individualClaimed: r.individualClaimed ?? Math.round(r.claimedScore / (r.totalOperators || 1)),
      normalizedPoints: r.normalizedPoints ?? 0,
    }));
  }

  async getAllSubmissions(seasonYear: number | undefined, memberCallsign?: string): Promise<any[]> {
    const conditions = [
      eq(schema.submissions.isActive, true),
      eq(schema.submissions.status, "accepted")
    ];

    if (seasonYear !== undefined) {
      conditions.push(eq(schema.submissions.seasonYear, seasonYear));
    }

    if (memberCallsign) {
      conditions.push(eq(schema.operatorPoints.memberCallsign, memberCallsign));
    }

    return db
      .select({
        id: schema.submissions.id,
        contestYear: schema.submissions.contestYear,
        contestKey: schema.submissions.contestKey,
        mode: schema.submissions.mode,
        callsign: schema.submissions.callsign,
        memberCallsign: schema.operatorPoints.memberCallsign,
        claimedScore: schema.submissions.claimedScore,
        individualClaimed: schema.operatorPoints.individualClaimed,
        normalizedPoints: sql<number>`ROUND(${schema.operatorPoints.normalizedPoints})`,
        submittedAt: schema.submissions.submittedAt,
        status: schema.submissions.status,
      })
      .from(schema.submissions)
      .innerJoin(schema.operatorPoints, eq(schema.submissions.id, schema.operatorPoints.submissionId))
      .where(and(...conditions))
      .orderBy(desc(schema.submissions.submittedAt));
  }

  async createRawLog(log: InsertRawLog): Promise<RawLog> {
    const result = await db.insert(schema.rawLogs).values(log).returning();
    return result[0];
  }

  async getBaseline(seasonYear: number, contestKey: string): Promise<Baseline | undefined> {
    const result = await db.select().from(schema.baselines).where(
      and(
        eq(schema.baselines.seasonYear, seasonYear),
        eq(schema.baselines.contestKey, contestKey)
      )
    ).limit(1);
    return result[0];
  }

  async upsertBaseline(baseline: InsertBaseline): Promise<void> {
    await db.insert(schema.baselines).values(baseline).onConflictDoUpdate({
      target: [schema.baselines.seasonYear, schema.baselines.contestKey],
      set: {
        highestSingleClaimed: baseline.highestSingleClaimed,
      },
    });
  }

  async createOperatorPoints(points: InsertOperatorPoints): Promise<OperatorPoints> {
    const result = await db.insert(schema.operatorPoints).values(points).returning();
    return result[0];
  }

  async deleteOperatorPointsBySubmission(submissionId: number): Promise<void> {
    await db.delete(schema.operatorPoints).where(eq(schema.operatorPoints.submissionId, submissionId));
  }

  async clearAllContestData(): Promise<void> {
    await db.delete(schema.operatorPoints);
    await db.delete(schema.rawLogs);
    await db.delete(schema.submissions);
    await db.delete(schema.baselines);
  }

  async getSeasonStats(seasonYear: number): Promise<any> {
    const allMembers = await db.select().from(schema.members);
    
    const eligibleMembers = allMembers.filter(m => {
      if (!m.duesExpiration) return false;
      const parts = m.duesExpiration.split('/');
      if (parts.length !== 3) return false;
      const [month, day, expirationYear] = parts.map(p => parseInt(p, 10));
      if (isNaN(expirationYear) || isNaN(month) || isNaN(day)) return false;
      const expirationDate = new Date(expirationYear, month - 1, day);
      const requiredDate = new Date(seasonYear, 11, 31);
      return expirationDate >= requiredDate;
    });

    const activeSubmissions = await db.select({
      memberOperators: schema.submissions.memberOperators,
    }).from(schema.submissions)
      .where(and(
        eq(schema.submissions.seasonYear, seasonYear),
        eq(schema.submissions.isActive, true),
        eq(schema.submissions.status, 'accepted')
      ));

    const activeCallsigns = new Set<string>();
    activeSubmissions.forEach(sub => {
      if (sub.memberOperators) {
        sub.memberOperators.split(',').forEach(op => activeCallsigns.add(op.trim()));
      }
    });

    const uniqueContests = await db.selectDistinct({
      contestKey: schema.submissions.contestKey,
    }).from(schema.submissions)
      .where(and(
        eq(schema.submissions.seasonYear, seasonYear),
        eq(schema.submissions.isActive, true)
      ))
      .orderBy(schema.submissions.contestKey);

    return {
      activeMembers: activeCallsigns.size,
      eligibleMembers: eligibleMembers.length,
      contests: uniqueContests,
    };
  }

  async getMostCompetitiveContests(limit: number): Promise<any[]> {
    // Get contests with most submissions across all years
    // Include all contests that tie with the 5th highest submission count
    const results = await db
      .select({
        contestKey: schema.submissions.contestKey,
        submissionCount: sql<number>`COUNT(DISTINCT ${schema.submissions.id})`.as('submission_count'),
        operatorCount: sql<number>`COUNT(DISTINCT ${schema.operatorPoints.memberCallsign})`.as('operator_count'),
      })
      .from(schema.submissions)
      .innerJoin(schema.operatorPoints, eq(schema.submissions.id, schema.operatorPoints.submissionId))
      .where(
        and(
          eq(schema.submissions.isActive, true),
          eq(schema.submissions.status, 'accepted')
        )
      )
      .groupBy(schema.submissions.contestKey)
      .orderBy(desc(sql`submission_count`))
      .limit(100); // Get more than needed to handle ties

    // Find the submission count of the 5th place (or last if fewer than 5)
    const fifthPlaceCount = results[Math.min(limit - 1, results.length - 1)]?.submissionCount || 0;
    
    // Include all contests with submission counts >= 5th place count
    const filtered = results.filter(r => r.submissionCount >= fifthPlaceCount);

    return filtered.map(r => ({
      contestKey: r.contestKey,
      submissionCount: r.submissionCount,
      operatorCount: r.operatorCount,
    }));
  }

  async getMostActiveOperators(limit: number): Promise<any[]> {
    // Get operators with highest total scores across all years
    // Include all operators that tie with the 5th highest score
    const results = await db
      .select({
        callsign: schema.operatorPoints.memberCallsign,
        totalScore: sql<number>`ROUND(SUM(${schema.operatorPoints.normalizedPoints}))`.as('total_score'),
        entryCount: sql<number>`COUNT(DISTINCT ${schema.operatorPoints.submissionId})`.as('entry_count'),
      })
      .from(schema.operatorPoints)
      .innerJoin(schema.submissions, eq(schema.operatorPoints.submissionId, schema.submissions.id))
      .where(
        and(
          eq(schema.submissions.isActive, true),
          eq(schema.submissions.status, 'accepted')
        )
      )
      .groupBy(schema.operatorPoints.memberCallsign)
      .orderBy(desc(sql`total_score`))
      .limit(100); // Get more than needed to handle ties

    // Find the score of the 5th place (or last if fewer than 5)
    const fifthPlaceScore = results[Math.min(limit - 1, results.length - 1)]?.totalScore || 0;
    
    // Include all operators with scores >= 5th place score
    const filtered = results.filter(r => r.totalScore >= fifthPlaceScore);

    return filtered.map(r => ({
      callsign: r.callsign,
      totalScore: r.totalScore,
      entryCount: r.entryCount,
    }));
  }

  async getScoringConfig(key: string): Promise<ScoringConfig | undefined> {
    const result = await db.select().from(schema.scoringConfig).where(eq(schema.scoringConfig.key, key)).limit(1);
    return result[0];
  }

  async setScoringConfig(config: InsertScoringConfig): Promise<void> {
    await db.insert(schema.scoringConfig).values(config).onConflictDoUpdate({
      target: schema.scoringConfig.key,
      set: {
        value: config.value,
        updatedAt: sql`NOW()`,
      },
    });
  }

  async getAllUniqueContests(): Promise<Array<{ contestYear: number; contestKey: string; submissionCount: number }>> {
    const results = await db
      .select({
        contestYear: schema.submissions.contestYear,
        contestKey: schema.submissions.contestKey,
        submissionCount: sql<number>`COUNT(DISTINCT ${schema.submissions.id})`.as('submission_count'),
      })
      .from(schema.submissions)
      .where(eq(schema.submissions.isActive, true))
      .groupBy(schema.submissions.contestYear, schema.submissions.contestKey)
      .orderBy(
        desc(schema.submissions.contestYear),
        schema.submissions.contestKey
      );
    
    return results;
  }
}

export const storage = new DbStorage();
