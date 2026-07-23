"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPIItem {
  label: string;
  value: string | number;
  change?: number;
  format?: "currency" | "percent" | "number";
}

interface KPIGridProps {
  items: KPIItem[];
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}

function formatKPIValue(value: string | number, format?: "currency" | "percent" | "number"): string {
  if (typeof value === "string") return value;
  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    case "percent":
      return `${value}%`;
    default:
      return value.toLocaleString();
  }
}

export function KPIGrid({ items, columns = 4, className }: KPIGridProps) {
  const gridCols = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    5: "sm:grid-cols-3 lg:grid-cols-5",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {items.map((item, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-text-secondary">{item.label}</p>
            <p className="mt-1 text-xl font-bold text-text-primary">{formatKPIValue(item.value, item.format)}</p>
            {item.change !== undefined && (
              <div className="mt-1 flex items-center gap-1">
                {item.change > 0 && <TrendingUp className="h-3 w-3 text-green-600" />}
                {item.change < 0 && <TrendingDown className="h-3 w-3 text-red-500" />}
                {item.change === 0 && <Minus className="h-3 w-3 text-text-muted" />}
                <span className={cn(
                  "text-xs font-medium",
                  item.change > 0 && "text-green-600",
                  item.change < 0 && "text-red-500",
                  item.change === 0 && "text-text-muted"
                )}>
                  {item.change > 0 ? "+" : ""}{item.change}%
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
