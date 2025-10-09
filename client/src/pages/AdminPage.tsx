import { useState } from "react";
import { Radio, Upload, Users, Settings, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContestResultsTable } from "@/components/ContestResultsTable";
import { StatCard } from "@/components/StatCard";

// TODO: remove mock data
const mockStats = {
  totalSubmissions: 156,
  accepted: 142,
  rejected: 8,
  processing: 6,
};

const mockSubmissions = [
  { callsign: "K1AR", claimedScore: 5420000, individualClaimed: 5420000, normalizedPoints: 1000000, effectiveOperators: 1, status: "accepted" as const },
  { callsign: "W1WEF", claimedScore: 4980000, individualClaimed: 4980000, normalizedPoints: 918821, effectiveOperators: 1, status: "accepted" as const },
  { callsign: "K1TTT", claimedScore: 3200000, individualClaimed: 1600000, normalizedPoints: 295203, effectiveOperators: 2, status: "processing" as const },
];

export default function AdminPage() {
  const [rosterFile, setRosterFile] = useState<File | null>(null);

  const handleRosterUpload = () => {
    console.log("Uploading roster:", rosterFile?.name);
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
              value={mockStats.totalSubmissions}
              icon={FileText}
            />
            <StatCard
              title="Accepted"
              value={mockStats.accepted}
              icon={Users}
            />
            <StatCard
              title="Rejected"
              value={mockStats.rejected}
              icon={FileText}
            />
            <StatCard
              title="Processing"
              value={mockStats.processing}
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
              <h3 className="text-2xl font-semibold">Recent Submissions</h3>
              <Button variant="outline" data-testid="button-export">
                <Upload className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <ContestResultsTable results={mockSubmissions} />
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
                  disabled={!rosterFile}
                  data-testid="button-upload-roster"
                >
                  Upload Roster
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
