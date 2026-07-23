"use client";

import { type LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  changePct?: number;
  icon: LucideIcon;
  iconClassName?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  changePct,
  icon: Icon,
  iconClassName,
}: StatCardProps) {
  const up = changePct !== undefined && changePct > 0;
  const down = changePct !== undefined && changePct < 0;
  const flat = changePct !== undefined && changePct === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4 text-brand-600", iconClassName)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-text-primary">{value}</div>
        <div className="mt-1 flex items-center gap-1.5">
          {changePct !== undefined && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                up && "text-green-600",
                down && "text-red-500",
                flat && "text-text-muted"
              )}
            >
              {up && <TrendingUp className="h-3 w-3" />}
              {down && <TrendingDown className="h-3 w-3" />}
              {flat && <Minus className="h-3 w-3" />}
              {up ? "+" : ""}
              {changePct}%
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-text-muted">{subtitle}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}