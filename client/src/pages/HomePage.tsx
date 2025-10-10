import { ScoreboardTable } from "@/components/ScoreboardTable";
import { StatCard } from "@/components/StatCard";
import { Trophy, Users, Radio, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export default function HomePage() {
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState("season");

  const { data: seasonLeaderboard = [], isLoading: isLoadingSeason } = useQuery({
    queryKey: ["/api/leaderboard", "season", currentYear],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard?type=season&year=${currentYear}`);
      if (!res.ok) throw new Error("Failed to fetch season leaderboard");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: alltimeLeaderboard = [], isLoading: isLoadingAlltime } = useQuery({
    queryKey: ["/api/leaderboard", "alltime"],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard?type=alltime`);
      if (!res.ok) throw new Error("Failed to fetch all-time leaderboard");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: seasonStats } = useQuery({
    queryKey: ["/api/stats", currentYear],
    queryFn: async () => {
      const res = await fetch(`/api/stats?year=${currentYear}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const leaderboard = activeTab === "season" ? seasonLeaderboard : alltimeLeaderboard;
  const isLoading = activeTab === "season" ? isLoadingSeason : isLoadingAlltime;

  const stats = {
    activeMembers: seasonStats?.activeMembers || 0,
    eligibleMembers: seasonStats?.eligibleMembers || 0,
    contestsTracked: seasonStats?.contests?.length || 0,
    topScore: leaderboard[0]?.normalizedPoints || 0,
  };
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">YCCC Awards Program</h1>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Active Members"
              value={`${stats.activeMembers}/${stats.eligibleMembers}`}
              icon={Users}
              description="Active members / Eligible members with current dues"
            />
            <Link href="/contests">
              <StatCard
                title="Contests Tracked"
                value={stats.contestsTracked}
                icon={Radio}
                description="Click to view all contests"
                className="cursor-pointer hover-elevate active-elevate-2"
              />
            </Link>
            <StatCard
              title="Top YCCC Score"
              value={stats.topScore.toLocaleString()}
              icon={Trophy}
              description={activeTab === "season" ? "Current season maximum" : "All-time maximum"}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList data-testid="tabs-leaderboard">
              <TabsTrigger value="season" data-testid="tab-season">
                {currentYear} Season
              </TabsTrigger>
              <TabsTrigger value="alltime" data-testid="tab-alltime">
                All-Time
              </TabsTrigger>
            </TabsList>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading..." : `Showing ${leaderboard.length} members by YCCC points`}
            </p>
          </div>

          <TabsContent value="season" data-testid="content-season">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading leaderboard...</div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No submissions yet. Be the first to submit a log!</div>
            ) : (
              <ScoreboardTable entries={leaderboard} />
            )}
          </TabsContent>

          <TabsContent value="alltime" data-testid="content-alltime">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading leaderboard...</div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No submissions yet. Be the first to submit a log!</div>
            ) : (
              <ScoreboardTable entries={leaderboard} />
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-12">
          <div className="p-6 rounded-lg border border-border max-w-2xl mx-auto">
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
