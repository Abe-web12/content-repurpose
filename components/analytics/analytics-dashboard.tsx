"use client";

import dynamic from "next/dynamic";
import { useAnalytics } from "@/hooks/use-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

const GenerationsChart = dynamic(
  () => import("@/components/analytics/generations-chart").then((m) => m.GenerationsChart),
  { ssr: false, loading: () => <Skeleton className="h-[250px]" /> }
);
const PlatformBreakdown = dynamic(
  () => import("@/components/analytics/platform-breakdown").then((m) => m.PlatformBreakdown),
  { ssr: false, loading: () => <Skeleton className="h-[250px]" /> }
);

export function AnalyticsDashboard() {
  const { data, loading } = useAnalytics();

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-16" /></CardContent></Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><CardContent className="pt-6"><Skeleton className="h-[250px]" /></CardContent></Card>
          <Card><CardContent className="pt-6"><Skeleton className="h-[250px]" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-text-secondary">
          Unable to load analytics data.
        </CardContent>
      </Card>
    );
  }

  const usage = data.usage ?? { used: 0, limit: -1, plan: "free" };
  const unlimited = usage.limit === -1;
  const percentage = unlimited ? 0 : Math.min(100, Math.round((usage.used / usage.limit) * 100));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-text-muted">Total Generations</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{data.totalGenerations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-text-muted">Scheduled Posts</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{data.totalScheduled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-text-muted">Published</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{data.totalPublished}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-text-muted">Quota Usage</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-text-primary">
                {unlimited ? "∞" : `${usage.used} / ${usage.limit}`}
              </span>
            </div>
            {!unlimited && (
              <Progress
                value={percentage}
                className="mt-2 h-1.5"
                indicatorClassName={percentage > 80 ? "bg-amber-500" : undefined}
              />
            )}
            <p className="mt-1 text-xs text-text-muted capitalize">{usage.plan} plan</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Generations Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <GenerationsChart data={data.monthlyTrend ?? []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Platform Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <PlatformBreakdown data={data.platformBreakdown ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
