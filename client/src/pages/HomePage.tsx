import { ScoreboardTable } from "@/components/ScoreboardTable";
import { StatCard } from "@/components/StatCard";
import { Users, Radio, Upload, Trophy, Target, Clock, Medal, Star, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useState, useCallback } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { queryClient } from "@/lib/queryClient";

// Achievement icon helper
const getAchievementIcon = (totalScore: number) => {
  if (totalScore >= 5000000) {
    return { icon: Trophy, label: "Elite Performer - 5M+ points", color: "text-yellow-500" };
  } else if (totalScore >= 1000000) {
    return { icon: Medal, label: "High Achiever - 1M-<5M points", color: "text-yellow-500" };
  } else if (totalScore >= 500000) {
    return { icon: Star, label: "Runner Up - 500K-<1M points", color: "text-yellow-500" };
  }
  return null;
};

export default function HomePage() {
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState("alltime");
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const handleWebSocketMessage = useCallback((message: { event: string; data: any }) => {
    if (message.event === "submission:created" || message.event === "roster:synced" || message.event === "cheerleader:spot") {
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/insights/competitive-contests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/insights/active-operators"] });
      queryClient.invalidateQueries({ queryKey: ["/api/insights/recent-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/insights/top-cheerleaders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/available-years"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cluster/status"] });
    }
  }, []);

  useWebSocket(handleWebSocketMessage);

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

  const { data: alltimeStats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const res = await fetch(`/api/stats`);
      if (!res.ok) throw new Error("Failed to fetch all-time stats");
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

  const { data: recentLogs = [] } = useQuery({
    queryKey: ["/api/insights/recent-logs"],
    queryFn: async () => {
      const res = await fetch(`/api/insights/recent-logs?limit=5`);
      if (!res.ok) throw new Error("Failed to fetch recent logs");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: topCheerleaders = [] } = useQuery({
    queryKey: ["/api/insights/top-cheerleaders"],
    queryFn: async () => {
      const res = await fetch(`/api/insights/top-cheerleaders?limit=5`);
      if (!res.ok) throw new Error("Failed to fetch top cheerleaders");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: clusterStatus } = useQuery({
    queryKey: ["/api/cluster/status"],
    queryFn: async () => {
      const res = await fetch(`/api/cluster/status`);
      if (!res.ok) throw new Error("Failed to fetch cluster status");
      return res.json();
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  const leaderboard = 
    activeTab === "current" ? currentYearLeaderboard : 
    activeTab === "alltime" ? alltimeLeaderboard :
    historicalLeaderboard;
  
  const isLoading = 
    activeTab === "current" ? isLoadingCurrent :
    activeTab === "alltime" ? isLoadingAlltime :
    isLoadingHistorical;

  const totalLogs = leaderboard.reduce((sum: number, entry: any) => sum + (entry.totalLogs || 0), 0);
  
  // Calculate total logs for all-time from all-time leaderboard
  const alltimeTotalLogs = alltimeLeaderboard.reduce((sum: number, entry: any) => sum + (entry.totalLogs || 0), 0);

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
          <p className="text-center text-muted-foreground mb-8 max-w-4xl mx-auto">
            Our club has always strived to achieve top scores in major contests where club competition is offered. We encourage members to participate in as many contests as possible throughout the year, honing their skills, building butt-in-chair stamina, and improving their stations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold">Most Recent Logs</h4>
              </div>
              <div className="space-y-2 mb-4 flex-1">
                {recentLogs.map((log: any, index: number) => {
                  const displayCallsign = log.operatorCallsign === log.stationCallsign 
                    ? log.operatorCallsign 
                    : `${log.operatorCallsign} (${log.stationCallsign})`;
                  const achievement = getAchievementIcon(log.totalScore || 0);
                  const AchievementIcon = achievement?.icon;
                  
                  return (
                    <div key={log.id} className="flex items-center justify-between text-sm" data-testid={`recent-log-${index}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-muted-foreground" data-testid={`recent-log-callsign-${index}`}>{displayCallsign}</span>
                        {achievement && AchievementIcon && (
                          <span className="inline-flex items-center" data-testid={`recent-log-achievement-${index}`}>
                            <AchievementIcon className={`h-3.5 w-3.5 ${achievement.color}`} />
                            <span className="sr-only">{achievement.label}</span>
                          </span>
                        )}
                      </div>
                      <Link href={`/submission/${log.submissionId}`}>
                        <span className="text-primary hover:underline cursor-pointer text-xs" data-testid={`recent-log-contest-${index}`}>{log.contestKey}</span>
                      </Link>
                    </div>
                  );
                })}
                {recentLogs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No logs yet</p>
                )}
              </div>
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  {alltimeTotalLogs.toLocaleString()} total {alltimeTotalLogs === 1 ? 'log' : 'logs'} submitted
                </p>
              </div>
            </Card>

            <Card className="p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold">Most Active Operators</h4>
              </div>
              <div className="space-y-2 mb-4 flex-1">
                {activeOperators.map((operator: any, index: number) => {
                  const achievement = getAchievementIcon(operator.totalScore || 0);
                  const AchievementIcon = achievement?.icon;
                  
                  return (
                    <div key={operator.callsign} className="flex items-center justify-between text-sm" data-testid={`active-operator-${index}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-muted-foreground">{operator.callsign}</span>
                        {achievement && AchievementIcon && (
                          <span className="inline-flex items-center" data-testid={`active-operator-achievement-${index}`}>
                            <AchievementIcon className={`h-3.5 w-3.5 ${achievement.color}`} />
                            <span className="sr-only">{achievement.label}</span>
                          </span>
                        )}
                      </div>
                      <Link href={`/operator/${operator.callsign}`}>
                        <span className="text-primary hover:underline cursor-pointer text-xs" data-testid={`entry-count-${index}`}>
                          {operator.entryCount} {operator.entryCount === 1 ? 'log' : 'logs'}
                        </span>
                      </Link>
                    </div>
                  );
                })}
                {activeOperators.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No data yet</p>
                )}
              </div>
              <div className="pt-4 border-t border-border">
                <Link href="/members" data-testid="link-members">
                  <p className="text-xs text-muted-foreground text-center hover:text-primary cursor-pointer">
                    {alltimeStats?.activeMembers || 0}/{alltimeStats?.eligibleMembers || 0} Active Members
                  </p>
                </Link>
              </div>
            </Card>

            <Card className="p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold">Most Competitive Contests</h4>
              </div>
              <div className="space-y-2 mb-4 flex-1">
                {competitiveContests.map((contest: any, index: number) => (
                  <div key={contest.contestKey} className="flex items-center justify-between text-sm" data-testid={`competitive-contest-${index}`}>
                    <span className="font-mono font-semibold text-muted-foreground text-xs">{contest.contestKey}</span>
                    <Link href={`/contest/${contest.contestKey}`}>
                      <span className="text-primary hover:underline cursor-pointer text-xs" data-testid={`submission-count-${index}`}>
                        {contest.submissionCount} {contest.submissionCount === 1 ? 'log' : 'logs'}
                      </span>
                    </Link>
                  </div>
                ))}
                {competitiveContests.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No data yet</p>
                )}
              </div>
              <div className="pt-4 border-t border-border">
                <Link href="/contests" data-testid="link-contests">
                  <p className="text-xs text-muted-foreground text-center hover:text-primary cursor-pointer">
                    {alltimeStats?.contests?.length || 0} Contests Tracked
                  </p>
                </Link>
              </div>
            </Card>

            <Card className="p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Radio className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold">Top Cheerleaders</h4>
              </div>
              <div className="space-y-2 mb-4 flex-1">
                {topCheerleaders.map((cheerleader: any, index: number) => {
                  const achievement = getAchievementIcon(cheerleader.totalScore || 0);
                  const AchievementIcon = achievement?.icon;
                  
                  return (
                    <div key={cheerleader.memberCallsign} className="flex items-center justify-between text-sm" data-testid={`top-cheerleader-${index}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-muted-foreground">{cheerleader.memberCallsign}</span>
                        {achievement && AchievementIcon && (
                          <span className="inline-flex items-center" data-testid={`cheerleader-achievement-${index}`}>
                            <AchievementIcon className={`h-3.5 w-3.5 ${achievement.color}`} />
                            <span className="sr-only">{achievement.label}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground" data-testid={`cheerleader-spots-${index}`}>
                        {cheerleader.totalSpots} {cheerleader.totalSpots === 1 ? 'spot' : 'spots'}
                      </span>
                    </div>
                  );
                })}
                {topCheerleaders.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No cheerleader points yet</p>
                )}
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-center gap-2">
                  <div 
                    className={`h-3 w-3 rounded-full ${
                      clusterStatus?.config?.enabled 
                        ? clusterStatus?.connected 
                          ? 'bg-green-500' 
                          : 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    data-testid="cluster-status-indicator"
                  />
                  <p className="text-xs text-muted-foreground" data-testid="cluster-status-message">
                    {clusterStatus?.config?.enabled ? (
                      clusterStatus?.connected ? (
                        "DX Cluster monitoring active"
                      ) : (
                        "DX Cluster enabled (connecting...)"
                      )
                    ) : (
                      "DX Cluster monitoring disabled"
                    )}
                  </p>
                </div>
              </div>
            </Card>
          </div>
          
          <div className="flex items-center justify-center gap-8 mt-4 text-xs text-muted-foreground" data-testid="achievement-legend">
            <div className="flex items-center gap-2" data-testid="legend-trophy">
              <Trophy className="h-3.5 w-3.5 text-yellow-500" />
              <span>Elite Performer (5M+)</span>
            </div>
            <div className="flex items-center gap-2" data-testid="legend-medal">
              <Medal className="h-3.5 w-3.5 text-yellow-500" />
              <span>High Achiever (1M-&lt;5M)</span>
            </div>
            <div className="flex items-center gap-2" data-testid="legend-star">
              <Star className="h-3.5 w-3.5 text-yellow-500" />
              <span>Runner Up (500K-&lt;1M)</span>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center gap-4 mb-6">
            <TabsList data-testid="tabs-leaderboard">
              <TabsTrigger value="alltime" data-testid="tab-alltime">
                All-Time
              </TabsTrigger>
              <TabsTrigger value="current" data-testid="tab-current">
                {currentYear}
              </TabsTrigger>
              <TabsTrigger value="historical" data-testid="tab-historical">
                Historical
              </TabsTrigger>
              <TabsTrigger value="help" data-testid="tab-help">
                <HelpCircle className="h-4 w-4 mr-2" />
                Help
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
              <div className="text-center py-12 text-muted-foreground">No submissions for {selectedYear}. Select a different year.</div>
            ) : (
              <ScoreboardTable entries={leaderboard} />
            )}
          </TabsContent>

          <TabsContent value="help" data-testid="content-help">
            <div className="max-w-4xl mx-auto">
              <Card className="p-8">
                <h2 className="text-2xl font-semibold mb-6">How Scoring Works</h2>
                
                <div className="space-y-6 text-sm">
                  <section>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      YCCC Award Points
                    </h3>
                    <p className="text-muted-foreground mb-2">
                      Your total YCCC Award Points is the sum of your Contest Points and Cheerleader Points:
                    </p>
                    <div className="bg-muted/50 p-4 rounded-md font-mono text-center">
                      YCCC Award Points = Contest Points + Cheerleader Points
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Contest Points
                    </h3>
                    <p className="text-muted-foreground mb-3">
                      Contest Points are calculated using a normalized scoring system that ensures fair comparison across different contests:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                      <li>
                        <strong className="text-foreground">Individual Score Calculation:</strong> For multi-operator logs, we divide the claimed score by the total number of operators listed in the log to get each operator's individual contribution.
                      </li>
                      <li>
                        <strong className="text-foreground">Normalization:</strong> Each operator's individual score is normalized against the highest individual score in that contest using this formula:
                        <div className="bg-muted/50 p-3 rounded-md font-mono text-xs mt-2">
                          Contest Points = (Your Individual Score / Highest Individual Score) × Max Points
                        </div>
                      </li>
                      <li>
                        <strong className="text-foreground">Max Points:</strong> The maximum possible points per contest is configurable by administrators (default: 1,000,000 points or dynamic based on participation).
                      </li>
                      <li>
                        <strong className="text-foreground">Accumulation:</strong> Your total Contest Points is the sum across all contests you've participated in.
                      </li>
                    </ol>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Radio className="h-5 w-5 text-primary" />
                      Cheerleader Points
                    </h3>
                    <p className="text-muted-foreground mb-3">
                      Cheerleader Points reward members for spotting other YCCC members on DX telnet clusters:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                      <li>
                        <strong className="text-foreground">Eligibility:</strong> Both the spotter and spotted callsign must be active YCCC members with current dues for the season.
                      </li>
                      <li>
                        <strong className="text-foreground">Points Per Spot:</strong> Each valid spot earns the spotter a configurable number of points (default: 100 points).
                      </li>
                      <li>
                        <strong className="text-foreground">Callsign Normalization:</strong> The system recognizes portable and DX prefixes (e.g., N2WQ/1, V47/K5ZD, LZ/K1XM/p) and correctly attributes spots to base callsigns.
                      </li>
                      <li>
                        <strong className="text-foreground">Season Tracking:</strong> Cheerleader Points are tracked per season and accumulate over time.
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Eligibility Requirements
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                      <li>
                        <strong className="text-foreground">Club Membership:</strong> All logs must show "Yankee Clipper Contest Club" as the club affiliation.
                      </li>
                      <li>
                        <strong className="text-foreground">Current Dues:</strong> Operators must have dues paid through December 31st of the contest year to receive points.
                      </li>
                      <li>
                        <strong className="text-foreground">Multi-Operator Logs:</strong> All valid YCCC operators listed in the log receive equal Contest Points. Operators with expired dues are excluded from scoring.
                      </li>
                      <li>
                        <strong className="text-foreground">Duplicate Submissions:</strong> If you submit multiple logs for the same contest/year, only the most recent submission counts.
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Medal className="h-5 w-5 text-primary" />
                      Achievement Tiers
                    </h3>
                    <p className="text-muted-foreground mb-3">
                      Achievement icons are displayed based on your total all-time YCCC Award Points:
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        <div>
                          <strong className="text-foreground">Elite Performer:</strong>
                          <span className="text-muted-foreground ml-2">5,000,000+ points</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                        <Medal className="h-5 w-5 text-yellow-500" />
                        <div>
                          <strong className="text-foreground">High Achiever:</strong>
                          <span className="text-muted-foreground ml-2">1,000,000 - 4,999,999 points</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                        <Star className="h-5 w-5 text-yellow-500" />
                        <div>
                          <strong className="text-foreground">Runner Up:</strong>
                          <span className="text-muted-foreground ml-2">500,000 - 999,999 points</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">Leaderboard Rankings</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                      <li>
                        <strong className="text-foreground">Dense Ranking:</strong> Operators with identical YCCC Award Points share the same rank, with no gaps in ranking numbers.
                      </li>
                      <li>
                        <strong className="text-foreground">All-Time:</strong> Aggregates all Contest Points and Cheerleader Points across all years.
                      </li>
                      <li>
                        <strong className="text-foreground">Current Year:</strong> Shows only Contest Points and Cheerleader Points earned in {currentYear}.
                      </li>
                      <li>
                        <strong className="text-foreground">Historical:</strong> View Contest Points and Cheerleader Points from previous years.
                      </li>
                    </ul>
                  </section>

                  <section className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground italic">
                      Questions about scoring? Visit the <Link href="/skipper"><span className="text-primary hover:underline cursor-pointer">Admin Page</span></Link> to view or adjust scoring configuration, or contact a club administrator.
                    </p>
                  </section>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
