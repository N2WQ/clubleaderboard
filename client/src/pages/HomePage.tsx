import { ScoreboardTable } from "@/components/ScoreboardTable";
import { StatCard } from "@/components/StatCard";
import { Users, Radio, Upload, Trophy, Target, Clock, Medal, Star } from "lucide-react";
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
        </Tabs>
      </main>
    </div>
  );
}
