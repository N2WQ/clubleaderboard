import { storage } from "./storage";
import type { Submission, Member } from "@shared/schema";
import { isDuesValidForYear } from "./roster-scraper";

export type ScoringMethod = 'fixed' | 'participant-based';

export async function getScoringMethod(): Promise<ScoringMethod> {
  const config = await storage.getScoringConfig('scoring_method');
  return (config?.value as ScoringMethod) || 'fixed';
}

export async function calculateMaxPoints(
  seasonYear: number,
  contestKey: string
): Promise<number> {
  const method = await getScoringMethod();
  
  if (method === 'fixed') {
    return 1000000;
  }
  
  // participant-based: count unique member operators across all accepted submissions
  const submissions = await storage.getActiveSubmissionsByContest(seasonYear, contestKey);
  const acceptedSubmissions = submissions.filter(s => s.status === 'accepted');
  
  // Collect all unique member operators
  const uniqueOperators = new Set<string>();
  for (const sub of acceptedSubmissions) {
    if (sub.memberOperators) {
      const operators = sub.memberOperators.split(',').map(op => op.trim());
      operators.forEach(op => uniqueOperators.add(op));
    }
  }
  
  const participantCount = uniqueOperators.size;
  
  // Fallback: if no participants found (e.g., first submission or data inconsistency),
  // use the submission count or minimum of 1 to avoid zero max points
  const effectiveParticipantCount = participantCount > 0 ? participantCount : Math.max(acceptedSubmissions.length, 1);
  
  // 50,000 points per participant, max 1,000,000
  return Math.min(effectiveParticipantCount * 50000, 1000000);
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  memberOperators?: string[];
  effectiveOperators?: number;
  excludedOperators?: string[];
  excludedReason?: string;
}

export async function validateSubmission(
  callsign: string,
  operators: string[],
  club: string,
  categoryOperator: string,
  seasonYear: number
): Promise<ValidationResult> {
  const normalizedClub = club.trim().toUpperCase();
  const expectedClub = "YANKEE CLIPPER CONTEST CLUB";
  
  if (normalizedClub !== expectedClub) {
    return {
      valid: false,
      error: `CLUB must be 'Yankee Clipper Contest Club' (found: '${club}')`,
    };
  }

  const allMembers = await storage.getAllActiveMembers();
  const memberMap = new Map<string, Member>();
  
  allMembers.forEach(member => {
    memberMap.set(member.callsign.toUpperCase(), member);
    if (member.aliases) {
      const aliases = member.aliases.split(',').map(a => a.trim().toUpperCase());
      aliases.forEach(alias => {
        if (alias) memberMap.set(alias, member);
      });
    }
  });

  const memberOperators: string[] = [];
  const operatorsToCheck = operators.length > 0 ? operators : [callsign];
  const expiredDuesOperators: string[] = [];

  for (const op of operatorsToCheck) {
    const normalizedOp = op.toUpperCase();
    if (memberMap.has(normalizedOp)) {
      const member = memberMap.get(normalizedOp)!;
      
      // Separate operators by dues status
      if (!member.duesExpiration || !isDuesValidForYear(member.duesExpiration, seasonYear)) {
        expiredDuesOperators.push(member.callsign);
      } else if (!memberOperators.includes(member.callsign)) {
        memberOperators.push(member.callsign);
      }
    }
  }

  // Only reject if NO operators have valid dues
  if (memberOperators.length === 0) {
    if (expiredDuesOperators.length > 0) {
      return {
        valid: false,
        error: `All operators have expired dues for ${seasonYear}: ${expiredDuesOperators.join(', ')}. At least one operator must have current dues through 12/31/${seasonYear}.`,
      };
    }
    return {
      valid: false,
      error: `No YCCC member operators found in submission.`,
    };
  }

  const isMultiOp = categoryOperator.includes('MULTI') || 
                    categoryOperator.includes('M/') ||
                    categoryOperator === 'CHECKLOG';

  // Multi-op: Just inform about excluded operators, don't reject
  // Points will be split among valid operators only

  const effectiveOperators = isMultiOp ? memberOperators.length : 1;

  return {
    valid: true,
    memberOperators,
    effectiveOperators,
    excludedOperators: expiredDuesOperators.length > 0 ? expiredDuesOperators : undefined,
    excludedReason: expiredDuesOperators.length > 0 
      ? `The following operators were excluded due to expired dues for ${seasonYear}: ${expiredDuesOperators.join(', ')}. They must have current dues through 12/31/${seasonYear}.`
      : undefined,
  };
}

export async function computeNormalizedPoints(
  submission: Submission,
  seasonYear: number
): Promise<number> {
  const individualClaimed = submission.claimedScore / submission.totalOperators;
  const maxPoints = await calculateMaxPoints(seasonYear, submission.contestKey);

  const baseline = await storage.getBaseline(seasonYear, submission.contestKey);
  
  if (!baseline || !baseline.highestSingleClaimed || baseline.highestSingleClaimed === 0) {
    const allSubmissions = await storage.getActiveSubmissionsByContest(
      seasonYear,
      submission.contestKey
    );
    
    const singleOpSubmissions = allSubmissions.filter(s => s.effectiveOperators === 1);
    
    if (singleOpSubmissions.length === 0) {
      const maxIndividual = Math.max(...allSubmissions.map(s => s.claimedScore / s.totalOperators));
      return maxIndividual > 0 ? (individualClaimed / maxIndividual) * maxPoints : maxPoints;
    }
    
    const maxSingleOp = Math.max(...singleOpSubmissions.map(s => s.claimedScore));
    await storage.upsertBaseline({
      seasonYear,
      contestKey: submission.contestKey,
      highestSingleClaimed: maxSingleOp,
    });
    
    return (individualClaimed / maxSingleOp) * maxPoints;
  }

  const normalizedPoints = (individualClaimed / baseline.highestSingleClaimed) * maxPoints;
  return normalizedPoints;
}

export async function recomputeBaseline(
  seasonYear: number,
  contestKey: string
): Promise<void> {
  const submissions = await storage.getActiveSubmissionsByContest(seasonYear, contestKey);
  const acceptedSubmissions = submissions.filter(s => s.status === 'accepted');
  
  if (acceptedSubmissions.length === 0) {
    return;
  }

  const maxPoints = await calculateMaxPoints(seasonYear, contestKey);
  const singleOpSubmissions = acceptedSubmissions.filter(s => s.effectiveOperators === 1);
  
  let maxScore: number;
  if (singleOpSubmissions.length > 0) {
    maxScore = Math.max(...singleOpSubmissions.map(s => s.claimedScore));
    await storage.upsertBaseline({
      seasonYear,
      contestKey,
      highestSingleClaimed: maxScore,
    });
  } else {
    // No single-op baseline yet, use max individual claimed as provisional baseline
    maxScore = Math.max(...acceptedSubmissions.map(s => s.claimedScore / s.totalOperators));
  }

  for (const sub of acceptedSubmissions) {
    await storage.deleteOperatorPointsBySubmission(sub.id);
    
    const memberOps = sub.memberOperators?.split(',') || [];
    const individualClaimed = sub.claimedScore / sub.totalOperators;
    const normalizedPoints = (individualClaimed / maxScore) * maxPoints;
    
    for (const memberCall of memberOps) {
      await storage.createOperatorPoints({
        submissionId: sub.id,
        memberCallsign: memberCall.trim(),
        individualClaimed: Math.round(individualClaimed),
        normalizedPoints,
      });
    }
  }
}
