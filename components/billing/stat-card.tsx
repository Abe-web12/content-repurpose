"use client";

import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: number; positive: boolean };
  loading?: boolean;
  className?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, loading, className }: StatCardProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-5">
          <Skeleton className="mb-2 h-4 w-20" />
          <Skeleton className="mb-1 h-8 w-32" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{title}</p>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
            {subtitle && (
              <p className="text-xs text-text-muted">{subtitle}</p>
            )}
          </div>
          {Icon && (
            <div className="rounded-lg bg-brand-50 p-2.5">
              <Icon className="h-5 w-5 text-brand-600" />
            </div>
          )}
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                trend.positive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700",
              )}
            >
              {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
            <span className="text-xs text-text-muted">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
