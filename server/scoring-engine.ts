import { storage } from "./storage";
import type { Submission, Member } from "@shared/schema";
import { isDuesValidForYear } from "./roster-scraper";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  memberOperators?: string[];
  effectiveOperators?: number;
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
  const invalidDuesOperators: string[] = [];
  
  console.log(`Validating submission for ${callsign}, operators:`, operatorsToCheck, `seasonYear: ${seasonYear}`);

  for (const op of operatorsToCheck) {
    const normalizedOp = op.toUpperCase();
    if (memberMap.has(normalizedOp)) {
      const member = memberMap.get(normalizedOp)!;
      
      console.log(`Checking operator ${op}:`, {
        callsign: member.callsign,
        duesExpiration: member.duesExpiration,
        isValid: member.duesExpiration ? isDuesValidForYear(member.duesExpiration, seasonYear) : false,
        seasonYear
      });
      
      // Require dues expiration data and validate it
      if (!member.duesExpiration || !isDuesValidForYear(member.duesExpiration, seasonYear)) {
        invalidDuesOperators.push(member.callsign);
      } else if (!memberOperators.includes(member.callsign)) {
        memberOperators.push(member.callsign);
      }
    } else {
      console.log(`Operator ${op} not found in member map`);
    }
  }

  if (invalidDuesOperators.length > 0) {
    return {
      valid: false,
      error: `The following operators have expired dues for ${seasonYear}: ${invalidDuesOperators.join(', ')}. Dues must be valid through 12/31/${seasonYear}.`,
    };
  }

  const isMultiOp = categoryOperator.includes('MULTI') || 
                    categoryOperator.includes('M/') ||
                    categoryOperator === 'CHECKLOG';

  if (isMultiOp && memberOperators.length < 2) {
    return {
      valid: false,
      error: `Multi-op submission must have at least 2 YCCC member operators with valid dues (found ${memberOperators.length})`,
    };
  }

  const effectiveOperators = isMultiOp ? memberOperators.length : 1;

  return {
    valid: true,
    memberOperators,
    effectiveOperators,
  };
}

export async function computeNormalizedPoints(
  submission: Submission,
  seasonYear: number
): Promise<number> {
  const individualClaimed = submission.claimedScore / submission.effectiveOperators;

  const baseline = await storage.getBaseline(seasonYear, submission.contestKey, submission.mode);
  
  if (!baseline || !baseline.highestSingleClaimed || baseline.highestSingleClaimed === 0) {
    const allSubmissions = await storage.getActiveSubmissionsByContest(
      seasonYear,
      submission.contestKey,
      submission.mode
    );
    
    const singleOpSubmissions = allSubmissions.filter(s => s.effectiveOperators === 1);
    
    if (singleOpSubmissions.length === 0) {
      const maxIndividual = Math.max(...allSubmissions.map(s => s.claimedScore / s.effectiveOperators));
      return maxIndividual > 0 ? (individualClaimed / maxIndividual) * 1000000 : 1000000;
    }
    
    const maxSingleOp = Math.max(...singleOpSubmissions.map(s => s.claimedScore));
    await storage.upsertBaseline({
      seasonYear,
      contestKey: submission.contestKey,
      mode: submission.mode,
      highestSingleClaimed: maxSingleOp,
    });
    
    return (individualClaimed / maxSingleOp) * 1000000;
  }

  const normalizedPoints = (individualClaimed / baseline.highestSingleClaimed) * 1000000;
  return Math.round(normalizedPoints);
}

export async function recomputeBaseline(
  seasonYear: number,
  contestKey: string,
  mode: string
): Promise<void> {
  const submissions = await storage.getActiveSubmissionsByContest(seasonYear, contestKey, mode);
  const singleOpSubmissions = submissions.filter(s => s.effectiveOperators === 1 && s.status === 'accepted');
  
  if (singleOpSubmissions.length === 0) {
    return;
  }

  const maxScore = Math.max(...singleOpSubmissions.map(s => s.claimedScore));
  
  await storage.upsertBaseline({
    seasonYear,
    contestKey,
    mode,
    highestSingleClaimed: maxScore,
  });

  for (const sub of submissions.filter(s => s.status === 'accepted')) {
    await storage.deleteOperatorPointsBySubmission(sub.id);
    
    const memberOps = sub.memberOperators?.split(',') || [];
    const individualClaimed = sub.claimedScore / sub.effectiveOperators;
    const normalizedPoints = (individualClaimed / maxScore) * 1000000;
    
    for (const memberCall of memberOps) {
      await storage.createOperatorPoints({
        submissionId: sub.id,
        memberCallsign: memberCall.trim(),
        individualClaimed,
        normalizedPoints: Math.round(normalizedPoints),
      });
    }
  }
}
