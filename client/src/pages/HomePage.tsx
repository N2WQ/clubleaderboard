import { ScoreboardTable } from "@/components/ScoreboardTable";
import { StatCard } from "@/components/StatCard";
import { Users, Radio, Upload, Trophy, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useState } from "react";

export default function HomePage() {
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState("current");
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const { data: currentYearLeaderboard = [], isLoading: isLoadingCurrent } = useQuery({
    queryKey: ["/api/leaderboard", "season", currentYear],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard?type=season&year=${currentYear}`);
      if (!res.ok) throw new Error("Failed to fetch current year leaderboard");
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

  const { data: historicalLeaderboard = [], isLoading: isLoadingHistorical } = useQuery({
    queryKey: ["/api/leaderboard", "season", selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard?type=season&year=${selectedYear}`);
      if (!res.ok) throw new Error("Failed to fetch historical leaderboard");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "historical",
  });

  const { data: availableYears = [] } = useQuery({
    queryKey: ["/api/available-years"],
    queryFn: async () => {
      const res = await fetch(`/api/available-years`);
      if (!res.ok) throw new Error("Failed to fetch available years");
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

  const { data: competitiveContests = [] } = useQuery({
    queryKey: ["/api/insights/competitive-contests"],
    queryFn: async () => {
      const res = await fetch(`/api/insights/competitive-contests?limit=5`);
      if (!res.ok) throw new Error("Failed to fetch competitive contests");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: activeOperators = [] } = useQuery({
    queryKey: ["/api/insights/active-operators"],
    queryFn: async () => {
      const res = await fetch(`/api/insights/active-operators?limit=5`);
      if (!res.ok) throw new Error("Failed to fetch active operators");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const leaderboard = 
    activeTab === "current" ? currentYearLeaderboard : 
    activeTab === "alltime" ? alltimeLeaderboard :
    historicalLeaderboard;
  
  const isLoading = 
    activeTab === "current" ? isLoadingCurrent :
    activeTab === "alltime" ? isLoadingAlltime :
    isLoadingHistorical;

  const stats = {
    activeMembers: seasonStats?.activeMembers || 0,
    eligibleMembers: seasonStats?.eligibleMembers || 0,
    contestsTracked: seasonStats?.contests?.length || 0,
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/members">
              <StatCard
                title="Active Members"
                value={`${stats.activeMembers}/${stats.eligibleMembers}`}
                icon={Users}
                description="Click to view all eligible members"
                className="cursor-pointer hover-elevate active-elevate-2"
              />
            </Link>
            <Link href="/contests">
              <StatCard
                title="Contests Tracked"
                value={stats.contestsTracked}
                icon={Radio}
                description="Click to view all contests"
                className="cursor-pointer hover-elevate active-elevate-2"
              />
            </Link>
          </div>
        </div>

        <div className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Most Competitive Contests</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Top contests by participating operators (all years)</p>
              <div className="space-y-3">
                {competitiveContests.slice(0, 5).map((contest: any, index: number) => (
                  <div key={`${contest.contestKey}-${contest.mode}`} className="flex items-center justify-between" data-testid={`competitive-contest-${index}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-sm w-6">#{index + 1}</span>
                      <div>
                        <span className="font-mono font-semibold text-sm">{contest.contestKey}</span>
                        <span className="text-muted-foreground text-xs ml-2">{contest.mode}</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-primary" data-testid={`operator-count-${index}`}>
                      {contest.operatorCount} operators
                    </span>
                  </div>
                ))}
                {competitiveContests.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Most Active Operators</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Top operators by contest entries (all years)</p>
              <div className="space-y-3">
                {activeOperators.slice(0, 5).map((operator: any, index: number) => (
                  <div key={operator.callsign} className="flex items-center justify-between" data-testid={`active-operator-${index}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-sm w-6">#{index + 1}</span>
                      <span className="font-mono font-semibold text-sm">{operator.callsign}</span>
                    </div>
                    <span className="text-sm font-semibold text-primary" data-testid={`entry-count-${index}`}>
                      {operator.entryCount} entries
                    </span>
                  </div>
                ))}
                {activeOperators.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <TabsList data-testid="tabs-leaderboard">
                <TabsTrigger value="current" data-testid="tab-current">
                  {currentYear}
                </TabsTrigger>
                <TabsTrigger value="alltime" data-testid="tab-alltime">
                  All-Time
                </TabsTrigger>
                <TabsTrigger value="historical" data-testid="tab-historical">
                  Historical
                </TabsTrigger>
              </TabsList>
              
              {activeTab === "historical" && (
                <Select 
                  value={selectedYear.toString()} 
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger className="w-32" data-testid="select-year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year: number) => (
                      <SelectItem key={year} value={year.toString()} data-testid={`option-year-${year}`}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading..." : `Showing ${leaderboard.length} members by YCCC points`}
            </p>
          </div>

          <TabsContent value="current" data-testid="content-current">
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

          <TabsContent value="historical" data-testid="content-historical">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading leaderboard...</div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No submissions for {selectedYear}. Upload logs to populate this year!</div>
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
                YCCC Points calculated to 1M maximum per contest/mode
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
