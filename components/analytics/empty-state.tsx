import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BarChart3, type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}

export function EmptyState({
  title = "No data available",
  description = "There is no analytics data for this period. Try selecting a different date range or generating some content first.",
  icon: Icon = BarChart3,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("py-12", className)}>
      <CardContent className="flex flex-col items-center justify-center text-center">
        <div className="rounded-full bg-surface-2 p-3 mb-4">
          <Icon className="h-6 w-6 text-text-secondary" />
        </div>
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        <p className="mt-1 text-sm text-text-secondary max-w-xs">{description}</p>
      </CardContent>
    </Card>
  );
}
