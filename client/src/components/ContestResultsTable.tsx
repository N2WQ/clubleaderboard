import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";

interface ContestResult {
  callsign: string;
  claimedScore: number;
  individualClaimed: number;
  normalizedPoints: number;
  effectiveOperators: number;
  status: "accepted" | "rejected" | "processing";
}

interface ContestResultsTableProps {
  results: ContestResult[];
}

export function ContestResultsTable({ results }: ContestResultsTableProps) {
  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Callsign</TableHead>
            <TableHead className="text-right">Eligible Operators</TableHead>
            <TableHead className="text-right">Claimed Score</TableHead>
            <TableHead className="text-right">Per Operator</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => (
            <TableRow key={result.callsign} className="hover-elevate">
              <TableCell className="font-mono font-semibold">
                {result.callsign}
              </TableCell>
              <TableCell className="text-right font-mono">
                {result.effectiveOperators}
              </TableCell>
              <TableCell className="text-right font-mono">
                {result.claimedScore.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">
                {Math.round(result.individualClaimed).toLocaleString()}
              </TableCell>
              <TableCell>
                <StatusBadge status={result.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
