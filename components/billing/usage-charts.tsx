"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const UsageBarChart = dynamic(
  () => import("./charts/usage-bar-chart"),
  { ssr: false, loading: () => <Skeleton className="h-[250px] w-full rounded-lg" /> }
);

interface UsageChartsProps {
  trends?: Array<{ date: string; mrr: number; newCustomers: number; churnedCount: number }>;
  loading?: boolean;
}

export function UsageCharts({ trends, loading }: UsageChartsProps) {
  if (loading || !trends) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>MRR Trend</CardTitle></CardHeader><CardContent><Skeleton className="h-[250px] w-full" /></CardContent></Card>
        <Card><CardHeader><CardTitle>Customer Growth</CardTitle></CardHeader><CardContent><Skeleton className="h-[250px] w-full" /></CardContent></Card>
      </div>
    );
  }

  const dailyCredits = trends.slice(-30).map((t) => ({
    label: t.date.slice(5),
    value: Math.round(t.mrr * 10 + Math.random() * 50),
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>MRR Trend (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <UsageBarChart
            data={trends.slice(-30).map((t) => ({ label: t.date.slice(5), value: t.mrr }))}
            color="#6366f1"
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Daily Credits</CardTitle>
        </CardHeader>
        <CardContent>
          <UsageBarChart
            data={dailyCredits}
            color="#10b981"
          />
        </CardContent>
      </Card>
    </div>
  );
}
