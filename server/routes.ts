import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import Papa from "papaparse";
import { storage } from "./storage";
import { parseCabrillo } from "./cabrillo-parser";
import { validateSubmission, computeNormalizedPoints, recomputeBaseline, calculateMaxPoints } from "./scoring-engine";
import { fetchYCCCRoster, isDuesValidForYear } from "./roster-scraper";
import { setupWebSocket, broadcast } from "./websocket";
import { startScheduler } from "./scheduler";
import { sendEmail, createSubmissionConfirmationEmail } from "./email-service";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

export async function registerRoutes(app: Express): Promise<Server> {
  const currentYear = new Date().getFullYear();

  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const content = req.file.buffer.toString('utf-8');
      const emailAddress = req.body.email; // Get email from form
      const parsed = parseCabrillo(content);

      if (!parsed.success || !parsed.data) {
        return res.status(400).json({ 
          error: parsed.error || "Failed to parse Cabrillo file" 
        });
      }

      const { data } = parsed;

      const contestYear = data.contestYear;
      
      const validation = await validateSubmission(
        data.callsign,
        data.operators,
        data.club,
        data.categoryOperator,
        contestYear
      );

      if (!validation.valid) {
        return res.status(400).json({ 
          status: "rejected",
          error: validation.error 
        });
      }

      const existingSubmissions = await storage.getActiveSubmissionsByContest(
        contestYear,
        data.contest
      );
      
      const existingSubmission = existingSubmissions.find(s => s.callsign === data.callsign);
      if (existingSubmission) {
        await storage.deleteOperatorPointsBySubmission(existingSubmission.id);
        await storage.deactivateSubmission(
          data.callsign,
          data.contest,
          contestYear
        );
      }

      const totalOperators = data.operators.length > 0 ? data.operators.length : 1;
      
      const submission = await storage.createSubmission({
        seasonYear: contestYear,
        contestYear: contestYear,
        contestKey: data.contest,
        mode: data.mode,
        callsign: data.callsign,
        categoryOperator: data.categoryOperator,
        claimedScore: data.claimedScore,
        operatorList: data.operators.join(','),
        memberOperators: validation.memberOperators?.join(','),
        totalOperators,
        effectiveOperators: validation.effectiveOperators || 1,
        club: data.club,
        status: "accepted",
        rejectReason: undefined,
      });

      await storage.createRawLog({
        submissionId: submission.id,
        filename: req.file.originalname,
        content: content,
      });

      await recomputeBaseline(contestYear, data.contest);

      const baseline = await storage.getBaseline(contestYear, data.contest);
      const memberOps = validation.memberOperators || [data.callsign];
      const individualClaimed = data.claimedScore / totalOperators;
      
      // Use dynamic max points based on scoring method
      const maxPoints = await calculateMaxPoints(contestYear, data.contest);
      const normalizedPoints = baseline?.highestSingleClaimed 
        ? (individualClaimed / baseline.highestSingleClaimed) * maxPoints
        : maxPoints;

      broadcast("submission:created", {
        submissionId: submission.id,
        callsign: data.callsign,
        contest: data.contest,
        mode: data.mode,
        seasonYear: contestYear,
      });

      // Send confirmation email if email address was provided
      if (emailAddress) {
        try {
          const htmlContent = createSubmissionConfirmationEmail(
            memberOps[0], // Primary operator
            data.callsign,
            data.contest,
            contestYear,
            data.claimedScore,
            'accepted'
          );
          
          await sendEmail({
            to: emailAddress,
            subject: `YCCC Awards: Log Accepted - ${data.contest}`,
            htmlContent,
          });
        } catch (emailError) {
          console.error(`Failed to send confirmation email:`, emailError);
          // Don't fail the submission if email fails
        }
      }

      res.json({
        status: "accepted",
        submissionId: submission.id,
        contest: data.contest,
        mode: data.mode,
        callsign: data.callsign,
        claimedScore: data.claimedScore,
        normalizedPoints: Math.round(normalizedPoints),
        memberOperators: memberOps,
        excludedOperators: validation.excludedOperators,
        warning: validation.excludedReason,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const seasonYear = parseInt(req.query.year as string) || currentYear;
      const stats = await storage.getSeasonStats(seasonYear);
      res.json(stats);
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const type = req.query.type as string || "season";
      const seasonYear = parseInt(req.query.year as string) || currentYear;
      
      const leaderboard = type === "alltime" 
        ? await storage.getAllTimeLeaderboard()
        : await storage.getSeasonLeaderboard(seasonYear);
      
      res.json(leaderboard);
    } catch (error) {
      console.error("Leaderboard error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/available-years", async (req, res) => {
    try {
      const years = await storage.getAvailableYears();
      res.json(years);
    } catch (error) {
      console.error("Available years error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/members/eligible", async (req, res) => {
    try {
      const seasonYear = parseInt(req.query.year as string) || currentYear;
      const members = await storage.getEligibleMembers(seasonYear);
      res.json({
        seasonYear,
        count: members.length,
        members,
      });
    } catch (error) {
      console.error("Eligible members error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/insights/competitive-contests", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const seasonYear = req.query.year ? parseInt(req.query.year as string) : undefined;
      const contests = await storage.getMostCompetitiveContests(limit, seasonYear);
      res.json(contests);
    } catch (error) {
      console.error("Competitive contests error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/insights/active-operators", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const seasonYear = req.query.year ? parseInt(req.query.year as string) : undefined;
      const operators = await storage.getMostActiveOperators(limit, seasonYear);
      res.json(operators);
    } catch (error) {
      console.error("Active operators error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/insights/recent-logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const logs = await storage.getMostRecentLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Recent logs error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/member/:callsign", async (req, res) => {
    try {
      const callsign = req.params.callsign.toUpperCase();
      const seasonYear = parseInt(req.query.year as string) || currentYear;
      
      const history = await storage.getMemberContestHistory(callsign, seasonYear);
      const leaderboard = await storage.getSeasonLeaderboard(seasonYear);
      const memberData = leaderboard.find(m => m.callsign === callsign);

      res.json({
        callsign,
        seasonYear,
        totalPoints: memberData?.normalizedPoints || 0,
        rank: memberData?.rank || 0,
        contests: memberData?.contests || 0,
        history,
      });
    } catch (error) {
      console.error("Member detail error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/contest/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const yearParam = req.query.year as string;
      
      if (yearParam) {
        // Year specified - return only that year
        const seasonYear = parseInt(yearParam);
        const results = await storage.getContestResults(key.toUpperCase(), seasonYear);
        const baseline = await storage.getBaseline(seasonYear, key.toUpperCase());

        res.json({
          contestKey: key.toUpperCase(),
          seasonYear,
          baseline: baseline?.highestSingleClaimed || 0,
          results,
        });
      } else {
        // No year specified - return all years combined
        const contestYears = await storage.getContestYears(key.toUpperCase());
        
        if (contestYears.length === 0) {
          return res.json({
            contestKey: key.toUpperCase(),
            seasonYear: null,
            baseline: 0,
            results: [],
          });
        }

        // Fetch results from all years and combine them
        const allResults = [];
        for (const year of contestYears) {
          const yearResults = await storage.getContestResults(key.toUpperCase(), year);
          allResults.push(...yearResults);
        }

        res.json({
          contestKey: key.toUpperCase(),
          seasonYear: null, // null indicates all years
          baseline: 0, // No single baseline for all years
          results: allResults,
        });
      }
    } catch (error) {
      console.error("Contest detail error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/submissions", async (req, res) => {
    try {
      const seasonYear = req.query.year ? parseInt(req.query.year as string) : undefined;
      const memberCallsign = req.query.callsign ? (req.query.callsign as string).toUpperCase() : undefined;
      
      const submissions = await storage.getAllSubmissions(seasonYear, memberCallsign);
      
      res.json({
        seasonYear: seasonYear || null,
        memberCallsign: memberCallsign || null,
        submissions,
      });
    } catch (error) {
      console.error("Submissions fetch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/submission/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const submission = await storage.getSubmissionDetails(id);
      
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }
      
      res.json(submission);
    } catch (error) {
      console.error("Submission detail error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/operator/:callsign", async (req, res) => {
    try {
      const callsign = req.params.callsign.toUpperCase();
      const member = await storage.getMember(callsign);
      const submissions = await storage.getAllSubmissions(undefined, callsign);
      const alltimeLeaderboard = await storage.getAllTimeLeaderboard();
      const operatorData = alltimeLeaderboard.find(m => m.callsign === callsign);

      res.json({
        callsign,
        member,
        totalPoints: operatorData?.normalizedPoints || 0,
        rank: operatorData?.rank || 0,
        totalContests: operatorData?.contests || 0,
        submissions,
      });
    } catch (error) {
      console.error("Operator detail error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/roster", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const content = req.file.buffer.toString('utf-8');
      const parsed = Papa.parse(content, { 
        header: true, 
        skipEmptyLines: true 
      });

      const members = parsed.data.map((row: any) => ({
        callsign: row.CALLSIGN?.toUpperCase(),
        activeYn: row.ACTIVE_YN === 'Y' || row.ACTIVE_YN === '1',
        aliases: row.ALIAS_CALLS || '',
      })).filter((m: any) => m.callsign);

      await storage.deleteAllMembers();
      await storage.createManyMembers(members);

      res.json({ 
        success: true,
        count: members.length,
        message: `Uploaded ${members.length} members` 
      });
    } catch (error) {
      console.error("Roster upload error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/contests", async (req, res) => {
    try {
      const contestKeys = await storage.getUniqueContestKeys();
      res.json(contestKeys);
    } catch (error) {
      console.error("Get contests error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/contest-years/:contestKey", async (req, res) => {
    try {
      const contestKey = req.params.contestKey;
      const years = await storage.getContestYears(contestKey);
      res.json(years);
    } catch (error) {
      console.error("Get contest years error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/sync-roster", async (req, res) => {
    try {
      const rosterMembers = await fetchYCCCRoster();
      
      if (rosterMembers.length === 0) {
        return res.status(500).json({ 
          error: "Failed to parse roster - no members found" 
        });
      }
      
      const members = rosterMembers.map(m => ({
        callsign: m.callsign.toUpperCase(),
        activeYn: true,
        aliases: '',
        firstName: m.firstName,
        lastName: m.lastName,
        duesExpiration: m.duesExpiration,
      }));

      // Only delete and replace if we successfully parsed members
      await storage.deleteAllMembers();
      await storage.createManyMembers(members);

      broadcast("roster:synced", {
        count: members.length,
      });

      res.json({ 
        success: true,
        count: members.length,
        message: `Synced ${members.length} members from yccc.org roster`,
        sample: members.slice(0, 3)
      });
    } catch (error) {
      console.error("Roster sync error:", error);
      res.status(500).json({ error: "Failed to sync roster from yccc.org" });
    }
  });

  app.post("/api/admin/import-csv", upload.single("file"), async (req, res) => {
    try {
      console.log("CSV import request received:", {
        file: req.file?.originalname,
        contestKey: req.body.contestKey,
        contestYear: req.body.contestYear,
        mode: req.body.mode
      });

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const contestKey = req.body.contestKey?.trim();
      const contestYear = parseInt(req.body.contestYear);
      const assignedMode = req.body.mode?.trim().toUpperCase();

      if (!contestKey || !contestYear || !assignedMode) {
        console.error("Missing required fields:", { contestKey, contestYear, assignedMode });
        return res.status(400).json({ error: "Contest key, year, and mode are required" });
      }

      const content = req.file.buffer.toString('utf-8');
      const parsed = Papa.parse(content, { 
        skipEmptyLines: true 
      });

      if (!parsed.data || parsed.data.length === 0) {
        return res.status(400).json({ error: "CSV file is empty or invalid" });
      }

      if (parsed.errors && parsed.errors.length > 0) {
        console.error("CSV parsing errors:", parsed.errors);
        return res.status(400).json({ 
          error: `CSV parsing failed: ${parsed.errors[0].message}` 
        });
      }

      let importedCount = 0;
      let skippedCount = 0;
      const results = [];
      const importedSubmissionIds: number[] = []; // Track imported submissions for batch point calculation

      // OPTIMIZATION: Cache data before loop to avoid N+1 queries
      console.log(`CSV import: Caching members and existing submissions...`);
      const allMembers = await storage.getAllActiveMembers();
      const memberMap = new Map<string, any>();
      
      allMembers.forEach(member => {
        memberMap.set(member.callsign.toUpperCase(), member);
        if (member.aliases) {
          const aliases = member.aliases.split(',').map((a: string) => a.trim().toUpperCase());
          aliases.forEach((alias: string) => {
            if (alias) memberMap.set(alias, member);
          });
        }
      });
      
      const existingSubmissions = await storage.getActiveSubmissionsByContest(contestYear, contestKey);
      const existingSubmissionsMap = new Map(existingSubmissions.map(s => [s.callsign, s]));
      
      console.log(`CSV import: Processing ${(parsed.data as any[]).length} rows...`);

      // Process each row
      for (let i = 0; i < (parsed.data as any[]).length; i++) {
        const row = (parsed.data as any[])[i];
        if (!row || row.length < 4) continue;

        try {
          const station = row[0]?.trim().toUpperCase();
          const category = row[1]?.trim();
          const csvMode = row[2]?.trim().toUpperCase();
          const scoreStr = row[3]?.toString().replace(/,/g, '').trim();
          const operatorsStr = row[4]?.trim() || '';

          if (!station || !category || !scoreStr) continue;

          // Filter by mode: only import rows that match the selected mode
          // CW matches CW, SSB matches PH (Phone)
          const modeMatches = 
            (assignedMode === 'CW' && csvMode === 'CW') ||
            (assignedMode === 'SSB' && csvMode === 'PH') ||
            (assignedMode === 'MIXED' && (csvMode === 'CW' || csvMode === 'PH'));

          if (!modeMatches) {
            skippedCount++;
            continue;
          }

          const claimedScore = parseInt(scoreStr);
          if (isNaN(claimedScore)) continue;

        // Parse operators list (space-separated, remove @ symbols)
        const operators = operatorsStr
          .split(/\s+/)
          .map((op: string) => op.replace(/@/g, '').trim().toUpperCase())
          .filter((op: string) => op.length > 0);

        // If no operators specified, use station callsign
        const operatorList = operators.length > 0 ? operators : [station];

        // OPTIMIZATION: Validate using cached member data
        const memberOperators: string[] = [];
        const operatorsToCheck = operatorList.length > 0 ? operatorList : [station];
        
        for (const op of operatorsToCheck) {
          const normalizedOp = op.toUpperCase();
          if (memberMap.has(normalizedOp)) {
            const member = memberMap.get(normalizedOp)!;
            // Check dues expiration
            if (member.duesExpiration && isDuesValidForYear(member.duesExpiration, contestYear)) {
              if (!memberOperators.includes(member.callsign)) {
                memberOperators.push(member.callsign);
              }
            }
          }
        }

        // OPTIMIZATION: Check existing submissions using cached map
        const existingSubmission = existingSubmissionsMap.get(station);
        if (existingSubmission) {
          await storage.deleteOperatorPointsBySubmission(existingSubmission.id);
          await storage.deactivateSubmission(station, contestKey, contestYear);
        }

        const totalOperators = operatorList.length;
        const effectiveOperators = memberOperators.length > 0 ? memberOperators.length : 1;
        
        // Create submission (accepted even if no valid operators for data preservation)
        const submission = await storage.createSubmission({
          seasonYear: contestYear,
          contestYear: contestYear,
          contestKey: contestKey,
          mode: assignedMode,
          callsign: station,
          categoryOperator: category,
          claimedScore: claimedScore,
          operatorList: operatorList.join(','),
          memberOperators: memberOperators.length > 0 ? memberOperators.join(',') : undefined,
          totalOperators,
          effectiveOperators,
          club: 'Yankee Clipper Contest Club',
          status: "accepted", // Accept all for historical import
          rejectReason: undefined,
        });

        importedSubmissionIds.push(submission.id); // Track for batch processing
        importedCount++;
        results.push({ station, category, mode: assignedMode, score: claimedScore, operators: operatorList.length });
        
        // Log progress every 10 rows
        if (importedCount % 10 === 0) {
          console.log(`CSV import progress: ${importedCount} rows processed...`);
        }
        } catch (rowError) {
          console.error(`Error processing row ${i}:`, rowError, row);
          // Continue to next row on error
        }
      }

      console.log(`CSV import: Processing complete. ${importedCount} submissions created. Now recomputing baselines and operator points...`);
      
      // OPTIMIZATION: Recompute baseline ONCE after all submissions are created
      await recomputeBaseline(contestYear, contestKey);
      const baseline = await storage.getBaseline(contestYear, contestKey);
      const maxPoints = await calculateMaxPoints(contestYear, contestKey);
      
      // OPTIMIZATION: Batch create operator points for all imported submissions
      const allSubmissions = await storage.getActiveSubmissionsByContest(contestYear, contestKey);
      const importedSubmissions = allSubmissions.filter(sub => importedSubmissionIds.includes(sub.id));
      
      // Build array of all operator points to insert
      const operatorPointsToInsert: any[] = [];
      for (const sub of importedSubmissions) {
        if (sub.status === 'accepted' && sub.memberOperators) {
          const memberOps = sub.memberOperators.split(',').filter(op => op.length > 0);
          const individualClaimed = sub.claimedScore / sub.totalOperators;
          const normalizedPoints = baseline?.highestSingleClaimed 
            ? (individualClaimed / baseline.highestSingleClaimed) * maxPoints
            : maxPoints;

          for (const operator of memberOps) {
            operatorPointsToInsert.push({
              submissionId: sub.id,
              memberCallsign: operator,
              individualClaimed: Math.round(individualClaimed),
              normalizedPoints: Math.round(normalizedPoints),
            });
          }
        }
      }
      
      // Batch insert all operator points at once
      await storage.batchCreateOperatorPoints(operatorPointsToInsert);
      console.log(`CSV import: Batch created ${operatorPointsToInsert.length} operator point records for ${importedSubmissions.length} submissions`);

      // Broadcast update
      broadcast("submission:created", {
        contest: contestKey,
        seasonYear: contestYear,
        count: importedCount,
      });

      res.json({
        success: true,
        count: importedCount,
        skipped: skippedCount,
        message: `Imported ${importedCount} ${assignedMode} submissions to ${contestKey} ${contestYear}${skippedCount > 0 ? ` (skipped ${skippedCount} non-${assignedMode} rows)` : ''}`,
        sample: results.slice(0, 5),
      });
    } catch (error) {
      console.error("CSV import error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to import CSV file";
      res.status(500).json({ error: `CSV import failed: ${errorMessage}` });
    }
  });

  app.post("/api/admin/recompute", async (req, res) => {
    try {
      const { contestKey, seasonYear } = req.body;
      await recomputeBaseline(seasonYear || currentYear, contestKey);
      res.json({ success: true });
    } catch (error) {
      console.error("Recompute error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/recompute-all", async (req, res) => {
    try {
      // Get all distinct contest/year combinations
      const allContests = await storage.getAllUniqueContests();
      
      let recomputedCount = 0;
      for (const contest of allContests) {
        await recomputeBaseline(contest.contestYear, contest.contestKey);
        recomputedCount++;
      }
      
      res.json({ 
        success: true, 
        message: `Recomputed ${recomputedCount} contest combinations`,
        count: recomputedCount
      });
    } catch (error) {
      console.error("Recompute all error:", error);
      res.status(500).json({ error: "Failed to recompute all contests" });
    }
  });

  app.post("/api/admin/clear-data", async (req, res) => {
    try {
      await storage.clearAllContestData();
      res.json({ 
        success: true,
        message: "All contest data has been cleared. Member roster preserved." 
      });
    } catch (error) {
      console.error("Clear data error:", error);
      res.status(500).json({ error: "Failed to clear contest data" });
    }
  });

  app.get("/api/admin/scoring-method", async (req, res) => {
    try {
      const config = await storage.getScoringConfig('scoring_method');
      res.json({ 
        method: config?.value || 'fixed',
        updatedAt: config?.updatedAt || null,
      });
    } catch (error) {
      console.error("Get scoring method error:", error);
      res.status(500).json({ error: "Failed to get scoring method" });
    }
  });

  app.post("/api/admin/scoring-method", async (req, res) => {
    try {
      const { method } = req.body;
      
      if (!['fixed', 'participant-based'].includes(method)) {
        return res.status(400).json({ error: "Method must be 'fixed' or 'participant-based'" });
      }

      await storage.setScoringConfig({
        key: 'scoring_method',
        value: method,
      });

      res.json({ 
        success: true,
        method,
        message: `Scoring method updated to '${method}'. You may want to recompute scores for this to take effect.`,
      });
    } catch (error) {
      console.error("Set scoring method error:", error);
      res.status(500).json({ error: "Failed to set scoring method" });
    }
  });

  const httpServer = createServer(app);
  
  setupWebSocket(httpServer);
  startScheduler();

  return httpServer;
}
