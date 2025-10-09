import { ScoreboardTable } from "@/components/ScoreboardTable";
import { StatCard } from "@/components/StatCard";
import { Trophy, Users, Radio, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function HomePage() {
  const currentYear = new Date().getFullYear();

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["/api/leaderboard"],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard?year=${currentYear}`);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
  });

  const stats = {
    totalMembers: leaderboard.length || 0,
    activeContests: leaderboard[0]?.contests || 0,
    topScore: leaderboard[0]?.normalizedPoints || 0,
  };
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
              value={stats.totalMembers}
              icon={Users}
              description="Participants this season"
            />
            <StatCard
              title="Contests Tracked"
              value={stats.activeContests}
              icon={Radio}
              description="Completed contests"
            />
            <StatCard
              title="Top Normalized Score"
              value={stats.topScore.toLocaleString()}
              icon={Trophy}
              description="Current season maximum"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold">Season Leaderboard</h3>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading..." : `Showing ${leaderboard.length} members by normalized points`}
            </p>
          </div>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading leaderboard...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No submissions yet. Be the first to submit a log!</div>
          ) : (
            <ScoreboardTable entries={leaderboard} />
          )}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-lg border border-border">
            <h4 className="font-semibold mb-2">Season Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="font-medium">Current Year</span>
                <span className="text-muted-foreground">{currentYear}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="font-medium">Total Participants</span>
                <span className="text-muted-foreground">{stats.totalMembers}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-medium">Submissions</span>
                <span className="text-muted-foreground">{leaderboard.reduce((sum, m) => sum + (m.contests || 0), 0)}</span>
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
