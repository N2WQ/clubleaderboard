import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
}

export function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-mono font-semibold" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {value.toLocaleString()}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-2">{description}</p>
          )}
        </div>
        {Icon && (
          <div className="ml-4">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>
    </Card>
  );
}
