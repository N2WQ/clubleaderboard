import { useState } from "react";
import { Radio, Upload, Users, Settings, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/StatCard";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const [rosterFile, setRosterFile] = useState<File | null>(null);
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

  const handleRosterUpload = () => {
    if (rosterFile) {
      uploadRosterMutation.mutate(rosterFile);
    }
  };

  const stats = {
    totalSubmissions: leaderboard.reduce((sum: number, m: any) => sum + (m.contests || 0), 0),
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
              <h3 className="text-xl font-semibold mb-4">Upload Member Roster</h3>
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

          <TabsContent value="settings" className="space-y-6">
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

                <Button variant="destructive" data-testid="button-reset-season">
                  Reset Season
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
