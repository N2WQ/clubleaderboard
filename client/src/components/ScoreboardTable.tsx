import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy } from "lucide-react";

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

export function ScoreboardTable({ entries }: ScoreboardTableProps) {
  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Rank</TableHead>
            <TableHead>Callsign</TableHead>
            <TableHead className="text-right">Contests</TableHead>
            <TableHead className="text-right">Total Claimed</TableHead>
            <TableHead className="text-right">Normalized Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.callsign} className="hover-elevate" data-testid={`row-scoreboard-${entry.callsign}`}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {entry.rank <= 3 && (
                    <Trophy className={`h-4 w-4 ${
                      entry.rank === 1 ? "text-yellow-500" :
                      entry.rank === 2 ? "text-gray-400" :
                      "text-amber-600"
                    }`} />
                  )}
                  <span className={entry.rank <= 3 ? "text-primary font-semibold" : ""}>
                    {entry.rank}
                  </span>
                </div>
              </TableCell>
              <TableCell className="font-mono font-semibold" data-testid={`text-callsign-${entry.callsign}`}>
                {entry.callsign}
              </TableCell>
              <TableCell className="text-right font-mono">{entry.contests}</TableCell>
              <TableCell className="text-right font-mono">
                {entry.claimedScore.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold text-primary">
                {entry.normalizedPoints.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
