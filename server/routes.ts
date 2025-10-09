import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import Papa from "papaparse";
import { storage } from "./storage";
import { parseCabrillo } from "./cabrillo-parser";
import { validateSubmission, computeNormalizedPoints, recomputeBaseline } from "./scoring-engine";
import { fetchYCCCRoster } from "./roster-scraper";

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
      const parsed = parseCabrillo(content);

      if (!parsed.success || !parsed.data) {
        return res.status(400).json({ 
          error: parsed.error || "Failed to parse Cabrillo file" 
        });
      }

      const { data } = parsed;

      const validation = await validateSubmission(
        data.callsign,
        data.operators,
        data.club,
        data.categoryOperator,
        currentYear
      );

      if (!validation.valid) {
        return res.status(400).json({ 
          status: "rejected",
          error: validation.error 
        });
      }

      const existingSubmissions = await storage.getActiveSubmissionsByContest(
        currentYear,
        data.contest,
        data.mode
      );
      
      const existingSubmission = existingSubmissions.find(s => s.callsign === data.callsign);
      if (existingSubmission) {
        await storage.deleteOperatorPointsBySubmission(existingSubmission.id);
        await storage.deactivateSubmission(
          data.callsign,
          data.contest,
          data.mode,
          currentYear
        );
      }

      const submission = await storage.createSubmission({
        seasonYear: currentYear,
        contestKey: data.contest,
        mode: data.mode,
        callsign: data.callsign,
        categoryOperator: data.categoryOperator,
        claimedScore: data.claimedScore,
        operatorList: data.operators.join(','),
        memberOperators: validation.memberOperators?.join(','),
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

      await recomputeBaseline(currentYear, data.contest, data.mode);

      const baseline = await storage.getBaseline(currentYear, data.contest, data.mode);
      const memberOps = validation.memberOperators || [data.callsign];
      const individualClaimed = data.claimedScore / (validation.effectiveOperators || 1);
      const normalizedPoints = baseline?.highestSingleClaimed 
        ? Math.round((individualClaimed / baseline.highestSingleClaimed) * 1000000)
        : 1000000;

      res.json({
        status: "accepted",
        submissionId: submission.id,
        contest: data.contest,
        mode: data.mode,
        callsign: data.callsign,
        claimedScore: data.claimedScore,
        normalizedPoints,
        memberOperators: memberOps,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const seasonYear = parseInt(req.query.year as string) || currentYear;
      const leaderboard = await storage.getSeasonLeaderboard(seasonYear);
      res.json(leaderboard);
    } catch (error) {
      console.error("Leaderboard error:", error);
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

  app.get("/api/contest/:key/:mode", async (req, res) => {
    try {
      const { key, mode } = req.params;
      const seasonYear = parseInt(req.query.year as string) || currentYear;
      
      const results = await storage.getContestResults(key.toUpperCase(), mode.toUpperCase(), seasonYear);
      const baseline = await storage.getBaseline(seasonYear, key.toUpperCase(), mode.toUpperCase());

      res.json({
        contestKey: key.toUpperCase(),
        mode: mode.toUpperCase(),
        seasonYear,
        baseline: baseline?.highestSingleClaimed || 0,
        results,
      });
    } catch (error) {
      console.error("Contest detail error:", error);
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

  app.post("/api/admin/recompute", async (req, res) => {
    try {
      const { contestKey, mode, seasonYear } = req.body;
      await recomputeBaseline(seasonYear || currentYear, contestKey, mode);
      res.json({ success: true });
    } catch (error) {
      console.error("Recompute error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
