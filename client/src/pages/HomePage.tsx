import { ScoreboardTable } from "@/components/ScoreboardTable";
import { StatCard } from "@/components/StatCard";
import { Trophy, Users, Radio, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

// TODO: remove mock data
const mockStats = {
  totalMembers: 247,
  activeContests: 12,
  topScore: 1000000,
};

const mockLeaderboard = [
  { rank: 1, callsign: "K1AR", claimedScore: 5420000, normalizedPoints: 1000000, contests: 8 },
  { rank: 2, callsign: "W1WEF", claimedScore: 4980000, normalizedPoints: 918821, contests: 7 },
  { rank: 3, callsign: "K1TTT", claimedScore: 4650000, normalizedPoints: 857895, contests: 6 },
  { rank: 4, callsign: "N1UR", claimedScore: 3890000, normalizedPoints: 717647, contests: 5 },
  { rank: 5, callsign: "W1XX", claimedScore: 3420000, normalizedPoints: 630952, contests: 6 },
  { rank: 6, callsign: "K1DG", claimedScore: 3120000, normalizedPoints: 575737, contests: 5 },
  { rank: 7, callsign: "W1TO", claimedScore: 2980000, normalizedPoints: 549815, contests: 4 },
  { rank: 8, callsign: "N1API", claimedScore: 2750000, normalizedPoints: 507353, contests: 5 },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">YCCC Contest Scoring</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/upload">
              <Button variant="default" data-testid="button-upload">
                <Upload className="h-4 w-4 mr-2" />
                Submit Log
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mb-12">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-8 md:p-12 mb-8">
            <h2 className="text-4xl font-bold mb-3">2025 Season Scoreboard</h2>
            <p className="text-lg text-muted-foreground">
              Automated normalized scoring for Yankee Clipper Contest Club members
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <StatCard
              title="Active Members"
              value={mockStats.totalMembers}
              icon={Users}
              description="Participants this season"
            />
            <StatCard
              title="Contests Tracked"
              value={mockStats.activeContests}
              icon={Radio}
              description="Completed contests"
            />
            <StatCard
              title="Top Normalized Score"
              value={mockStats.topScore.toLocaleString()}
              icon={Trophy}
              description="Current season maximum"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold">Season Leaderboard</h3>
            <p className="text-sm text-muted-foreground">
              Showing top 50 members by normalized points
            </p>
          </div>
          <ScoreboardTable entries={mockLeaderboard} />
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-lg border border-border">
            <h4 className="font-semibold mb-2">Recent Contests</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="font-mono">CQWW CW</span>
                <span className="text-muted-foreground">45 submissions</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="font-mono">ARRLDX SSB</span>
                <span className="text-muted-foreground">38 submissions</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-mono">CQWPX RTTY</span>
                <span className="text-muted-foreground">32 submissions</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg border border-border">
            <h4 className="font-semibold mb-2">How It Works</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">1.</span>
                Submit your Cabrillo log file (.log or .cbr)
              </li>
              <li className="flex gap-2">
                <span className="text-primary">2.</span>
                System validates club affiliation and operators
              </li>
              <li className="flex gap-2">
                <span className="text-primary">3.</span>
                Scores normalized to 1M points per contest/mode
              </li>
              <li className="flex gap-2">
                <span className="text-primary">4.</span>
                Results appear instantly on the scoreboard
              </li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="border-t border-border mt-24 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Yankee Clipper Contest Club • Automated Scoring System</p>
        </div>
      </footer>
    </div>
  );
}
