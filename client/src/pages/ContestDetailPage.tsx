import { ContestResultsTable } from "@/components/ContestResultsTable";
import { ContestBadge } from "@/components/ContestBadge";
import { Radio, ArrowLeft, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";

// TODO: remove mock data
const mockContest = {
  name: "CQWW",
  mode: "CW",
  date: "2025-11-28",
  participants: 45,
  highestSingleOp: 5420000,
};

const mockResults = [
  { callsign: "K1AR", claimedScore: 5420000, individualClaimed: 5420000, normalizedPoints: 1000000, effectiveOperators: 1, status: "accepted" as const },
  { callsign: "W1WEF", claimedScore: 4980000, individualClaimed: 4980000, normalizedPoints: 918821, effectiveOperators: 1, status: "accepted" as const },
  { callsign: "K1TTT", claimedScore: 3200000, individualClaimed: 1600000, normalizedPoints: 295203, effectiveOperators: 2, status: "accepted" as const },
  { callsign: "N1UR", claimedScore: 2400000, individualClaimed: 2400000, normalizedPoints: 442804, effectiveOperators: 1, status: "accepted" as const },
  { callsign: "W1XX", claimedScore: 2100000, individualClaimed: 2100000, normalizedPoints: 387360, effectiveOperators: 1, status: "accepted" as const },
  { callsign: "K1DG", claimedScore: 1850000, individualClaimed: 1850000, normalizedPoints: 341328, effectiveOperators: 1, status: "processing" as const },
];

export default function ContestDetailPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">YCCC Awards Program</h1>
          </div>
          <Link href="/">
            <Button variant="ghost" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Scoreboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-8">
          <ContestBadge contest={mockContest.name} mode={mockContest.mode} />
          <h2 className="text-3xl font-bold mt-4 mb-6">Contest Results</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Contest Date</p>
              </div>
              <p className="text-xl font-semibold">
                {new Date(mockContest.date).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Participants</p>
              </div>
              <p className="text-xl font-semibold">{mockContest.participants}</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Radio className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Baseline Score</p>
              </div>
              <p className="text-xl font-semibold font-mono">
                {mockContest.highestSingleOp.toLocaleString()}
              </p>
            </Card>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold">All Submissions</h3>
            <p className="text-sm text-muted-foreground">
              Normalized to 1M points maximum
            </p>
          </div>
          <ContestResultsTable results={mockResults} />
        </div>

        <div className="mt-8 p-6 rounded-lg border border-border bg-muted/30">
          <h4 className="font-semibold mb-3">Scoring Formula</h4>
          <div className="font-mono text-sm bg-background p-4 rounded border border-border">
            <p className="mb-2">Normalized Points = (Individual Claimed / Highest Single-Op) × 1,000,000</p>
            <p className="text-muted-foreground text-xs">
              where Individual Claimed = Claimed Score / Effective Operators
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
