import { useState } from "react";
import { Radio, Upload, Users, Settings, FileText, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/StatCard";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminPage() {
  const [rosterFile, setRosterFile] = useState<File | null>(null);
  const [emailCallsign, setEmailCallsign] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [selectedContest, setSelectedContest] = useState("");
  const [selectedMode, setSelectedMode] = useState("");
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  const { data: leaderboard = [] } = useQuery({
    queryKey: ["/api/leaderboard"],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard?year=${currentYear}`);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
  });

  const { data: scoringMethod } = useQuery({
    queryKey: ["/api/admin/scoring-method"],
    queryFn: async () => {
      const res = await fetch("/api/admin/scoring-method");
      if (!res.ok) throw new Error("Failed to fetch scoring method");
      return res.json();
    },
  });

  const { data: availableContests = [] } = useQuery({
    queryKey: ["/api/admin/contests"],
    queryFn: async () => {
      const res = await fetch("/api/admin/contests");
      if (!res.ok) throw new Error("Failed to fetch contests");
      return res.json();
    },
  });

  const updateScoringMethodMutation = useMutation({
    mutationFn: async (method: string) => {
      const res = await fetch("/api/admin/scoring-method", {
        method: "POST",
        body: JSON.stringify({ method }),
        headers: { "Content-Type": "application/json" },
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Update failed");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scoring-method"] });
      toast({
        title: "Scoring Method Updated",
        description: data.message || "Scoring method has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    },
  });

  const uploadRosterMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/admin/roster", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Roster Uploaded",
        description: `Successfully uploaded ${data.count} members`,
      });
      setRosterFile(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message,
      });
    },
  });

  const syncRosterMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/sync-roster", {
        method: "POST",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Sync failed");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Roster Synced",
        description: data.message || `Successfully synced ${data.count} members from yccc.org`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message,
      });
    },
  });

  const clearDataMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/clear-data", {
        method: "POST",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Clear failed");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Database Cleared",
        description: data.message || "All contest data has been cleared. Member roster preserved.",
      });
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Clear Failed",
        description: error.message,
      });
    },
  });

  const recomputeAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/recompute-all", {
        method: "POST",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Recompute failed");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      toast({
        title: "Recompute Complete",
        description: data.message || `Successfully recomputed ${data.count} contest combinations`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Recompute Failed",
        description: error.message,
      });
    },
  });

  const importCsvMutation = useMutation({
    mutationFn: async (data: { file: File; contestKey: string; contestYear: string; mode: string }) => {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("contestKey", data.contestKey);
      formData.append("contestYear", data.contestYear);
      formData.append("mode", data.mode);
      
      const res = await fetch("/api/admin/import-csv", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Import failed");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      toast({
        title: "Import Complete",
        description: data.message || `Successfully imported ${data.count} submissions`,
      });
      setCsvFile(null);
      setSelectedContest("");
      setSelectedMode("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error.message,
      });
    },
  });

  const handleRosterUpload = () => {
    if (rosterFile) {
      uploadRosterMutation.mutate(rosterFile);
    }
  };

  const handleCsvImport = () => {
    if (csvFile && selectedContest && selectedMode) {
      const [contestKey, year] = selectedContest.split('|');
      importCsvMutation.mutate({ 
        file: csvFile, 
        contestKey, 
        contestYear: year,
        mode: selectedMode 
      });
    }
  };

  const stats = {
    totalSubmissions: leaderboard.reduce((sum: number, m: any) => sum + Number(m.contests || 0), 0),
    accepted: leaderboard.length,
    rejected: 0,
    processing: 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">YCCC Admin Dashboard</h1>
          </div>
          <Button variant="outline" data-testid="button-logout">
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-6">System Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Submissions"
              value={stats.totalSubmissions}
              icon={FileText}
            />
            <StatCard
              title="Accepted"
              value={stats.accepted}
              icon={Users}
            />
            <StatCard
              title="Rejected"
              value={stats.rejected}
              icon={FileText}
            />
            <StatCard
              title="Processing"
              value={stats.processing}
              icon={Settings}
            />
          </div>
        </div>

        <Tabs defaultValue="submissions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="submissions" data-testid="tab-submissions">
              Submissions
            </TabsTrigger>
            <TabsTrigger value="roster" data-testid="tab-roster">
              Member Roster
            </TabsTrigger>
            <TabsTrigger value="import" data-testid="tab-import">
              Import CSV
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submissions" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold">Season Statistics</h3>
            </div>
            <div className="p-6 rounded-lg border border-border">
              <p className="text-muted-foreground mb-4">
                View detailed submissions in the contest detail pages from the main scoreboard
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                  <p className="text-2xl font-semibold">{stats.accepted}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Submissions</p>
                  <p className="text-2xl font-semibold">{stats.totalSubmissions}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="roster" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Sync from YCCC Website</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Automatically fetch the latest member roster from yccc.org/roster/ including dues expiration dates
              </p>

              <Button
                onClick={() => syncRosterMutation.mutate()}
                disabled={syncRosterMutation.isPending}
                data-testid="button-sync-roster"
              >
                {syncRosterMutation.isPending ? "Syncing..." : "Sync from Website"}
              </Button>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Manual Upload (Legacy)</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Upload a CSV file with columns: CALLSIGN, ACTIVE_YN, ALIAS_CALLS
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roster-file">Roster CSV File</Label>
                  <Input
                    id="roster-file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setRosterFile(e.target.files?.[0] || null)}
                    data-testid="input-roster-file"
                  />
                </div>

                {rosterFile && (
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm font-medium">Selected: {rosterFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(rosterFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleRosterUpload}
                  disabled={!rosterFile || uploadRosterMutation.isPending}
                  data-testid="button-upload-roster"
                >
                  {uploadRosterMutation.isPending ? "Uploading..." : "Upload Roster"}
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Current Roster Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Active Members</p>
                  <p className="text-2xl font-mono font-semibold">247</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="text-2xl font-semibold">Jan 1, 2025</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Import Historical Contest Data</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Import contest results from sponsor CSV files. Select an existing contest, mode, and upload the CSV file.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="select-contest">Select Contest</Label>
                  <Select
                    value={selectedContest}
                    onValueChange={setSelectedContest}
                  >
                    <SelectTrigger id="select-contest" data-testid="select-contest">
                      <SelectValue placeholder="Choose a contest..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableContests.map((contest: any) => (
                        <SelectItem 
                          key={`${contest.contestKey}-${contest.seasonYear}`} 
                          value={`${contest.contestKey}|${contest.seasonYear}`}
                          data-testid={`option-contest-${contest.contestKey}-${contest.seasonYear}`}
                        >
                          {contest.contestKey} ({contest.seasonYear})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select the contest to which this CSV data belongs
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="select-mode">Select Mode</Label>
                  <Select
                    value={selectedMode}
                    onValueChange={setSelectedMode}
                  >
                    <SelectTrigger id="select-mode" data-testid="select-mode">
                      <SelectValue placeholder="Choose mode..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CW" data-testid="option-mode-cw">CW</SelectItem>
                      <SelectItem value="SSB" data-testid="option-mode-ssb">SSB (Phone)</SelectItem>
                      <SelectItem value="MIXED" data-testid="option-mode-mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    All imported entries will be assigned this mode
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="csv-file">CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    data-testid="input-csv-file"
                  />
                  <p className="text-xs text-muted-foreground">
                    Expected format: Station, Category, Mode, Score, Operators
                  </p>
                </div>

                {csvFile && (
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm font-medium">Selected: {csvFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(csvFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Import Notes</p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>• Mode from dropdown will be applied to all entries</li>
                    <li>• Operators will be validated against current roster</li>
                    <li>• Only operators with current dues will be scored</li>
                    <li>• Duplicate submissions will deactivate previous entries</li>
                  </ul>
                </div>

                <Button
                  onClick={handleCsvImport}
                  disabled={!csvFile || !selectedContest || !selectedMode || importCsvMutation.isPending}
                  data-testid="button-import-csv"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  {importCsvMutation.isPending ? "Importing..." : "Import CSV"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Scoring Method</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Configure how maximum YCCC points are calculated for contests
              </p>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="scoring-method">Scoring Method</Label>
                  <Select
                    value={scoringMethod?.method || 'fixed'}
                    onValueChange={(value) => updateScoringMethodMutation.mutate(value)}
                    disabled={updateScoringMethodMutation.isPending}
                  >
                    <SelectTrigger id="scoring-method" data-testid="select-scoring-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed" data-testid="option-fixed">
                        Fixed (1,000,000 points)
                      </SelectItem>
                      <SelectItem value="participant-based" data-testid="option-participant-based">
                        Participant-Based (50k per participant, max 1M)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm font-medium mb-2">Current Method: {scoringMethod?.method === 'participant-based' ? 'Participant-Based' : 'Fixed'}</p>
                  <p className="text-xs text-muted-foreground">
                    {scoringMethod?.method === 'participant-based' 
                      ? 'Maximum points = min(participant count × 50,000, 1,000,000). Rewards participation in smaller contests.'
                      : 'Maximum points are always 1,000,000 regardless of participant count.'}
                  </p>
                  {scoringMethod?.updatedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Last updated: {new Date(scoringMethod.updatedAt).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Note: After changing scoring method</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use the "Recompute All Contests" button below to apply the new scoring method to all existing contest data.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Recompute All Contests</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Recalculate scores for all contests using the current scoring method. Use this after changing the scoring method.
              </p>

              <Button
                onClick={() => recomputeAllMutation.mutate()}
                disabled={recomputeAllMutation.isPending}
                data-testid="button-recompute-all"
              >
                {recomputeAllMutation.isPending ? "Recomputing..." : "Recompute All Contests"}
              </Button>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Season Management</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Reset season totals and start a new scoring period
              </p>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm font-medium text-destructive">Warning: This action cannot be undone</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Current season data will be archived before reset
                  </p>
                </div>

                <Button 
                  variant="destructive" 
                  onClick={() => clearDataMutation.mutate()}
                  disabled={clearDataMutation.isPending}
                  data-testid="button-reset-season"
                >
                  {clearDataMutation.isPending ? "Clearing..." : "Clear All Contest Data"}
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Rebuild Scoreboard</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Force regeneration of all static HTML pages
              </p>

              <Button variant="outline" data-testid="button-rebuild">
                <Settings className="h-4 w-4 mr-2" />
                Rebuild All Pages
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
