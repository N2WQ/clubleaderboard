import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "wouter";
import { Trophy, Medal } from "lucide-react";

interface ScoreboardEntry {
  rank: number;
  callsign: string;
  claimedScore: number;
  normalizedPoints: number;
  contests: number;
}

interface ScoreboardTableProps {
  entries: ScoreboardEntry[];
}

interface Achievement {
  threshold: number;
  icon: typeof Trophy | typeof Medal;
  label: string;
  color: string;
}

const ACHIEVEMENTS: Achievement[] = [
  { 
    threshold: 5000000, 
    icon: Trophy, 
    label: "Elite Performer - 5M+ points",
    color: "text-yellow-500"
  },
  { 
    threshold: 1000000, 
    icon: Medal, 
    label: "High Achiever - 1M+ points",
    color: "text-yellow-500"
  },
];

export function ScoreboardTable({ entries }: ScoreboardTableProps) {
  const getAchievement = (points: number): Achievement | null => {
    return ACHIEVEMENTS.find(achievement => points >= achievement.threshold) || null;
  };

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Rank</TableHead>
            <TableHead>Callsign</TableHead>
            <TableHead className="text-right">Contests</TableHead>
            <TableHead className="text-right">Claimed Points</TableHead>
            <TableHead className="text-right">YCCC Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const achievement = getAchievement(entry.normalizedPoints);
            const AchievementIcon = achievement?.icon;
            
            return (
              <TableRow key={entry.callsign} className="hover-elevate" data-testid={`row-scoreboard-${entry.callsign}`}>
                <TableCell className="font-medium">
                  <span className={entry.rank <= 3 ? "text-primary font-semibold" : ""}>
                    {entry.rank}
                  </span>
                </TableCell>
                <TableCell className="font-mono font-semibold" data-testid={`text-callsign-${entry.callsign}`}>
                  {entry.callsign}
                  {achievement && AchievementIcon && (
                    <span className="inline-flex items-center ml-2" data-testid={`achievement-${entry.callsign}`}>
                      <AchievementIcon className={`h-4 w-4 ${achievement.color}`} />
                      <span className="sr-only">{achievement.label}</span>
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  <Link href={`/submissions?callsign=${entry.callsign}`}>
                    <button className="hover:text-primary hover:underline" data-testid={`link-contests-${entry.callsign}`}>
                      {entry.contests}
                    </button>
                  </Link>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {Math.round(entry.claimedScore).toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold text-primary">
                  <Link href={`/submissions?callsign=${entry.callsign}`}>
                    <button className="hover:underline" data-testid={`link-points-${entry.callsign}`}>
                      {Math.round(entry.normalizedPoints).toLocaleString()}
                    </button>
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
