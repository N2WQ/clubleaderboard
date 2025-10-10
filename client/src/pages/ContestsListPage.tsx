import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ContestsListPage() {
  const currentYear = new Date().getFullYear();
  
  const { data: seasonStats, isLoading } = useQuery({
    queryKey: ["/api/stats", currentYear],
    queryFn: async () => {
      const res = await fetch(`/api/stats?year=${currentYear}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const contests = seasonStats?.contests || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Radio className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">YCCC Awards Program</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Contests Tracked - {currentYear} Season</h2>
          <p className="text-muted-foreground">
            All contests with submissions for the {currentYear} season
          </p>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground">Loading contests...</div>
        ) : contests.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No contests tracked yet for the {currentYear} season.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contests.map((contest: { contestKey: string; mode: string }) => (
              <Link
                key={`${contest.contestKey}-${contest.mode}`}
                href={`/contest/${contest.contestKey}?mode=${contest.mode}`}
              >
                <Card className="p-6 hover-elevate active-elevate-2 cursor-pointer" data-testid={`card-contest-${contest.contestKey}-${contest.mode}`}>
                  <div className="flex items-center gap-3">
                    <Radio className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold font-mono">{contest.contestKey}</h3>
                      <p className="text-sm text-muted-foreground">{contest.mode}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
