import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

type Status = "accepted" | "rejected" | "processing";

interface StatusBadgeProps {
  status: Status;
}

const statusConfig = {
  accepted: {
    label: "Accepted",
    icon: CheckCircle2,
    className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  processing: {
    label: "Processing",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={config.className}
      data-testid={`badge-status-${status}`}
    >
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
