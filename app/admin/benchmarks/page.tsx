"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBenchmarks } from "@/hooks/use-benchmarks";
import { BarChartCard, PieChartCard } from "@/components/charts";
import { Trophy } from "lucide-react";

const METRICS = ["mrr", "arr", "revenue", "churn", "customers", "growth", "api_usage", "ai_usage", "workflows"];
const PERIODS = ["daily", "weekly", "monthly", "quarterly", "yearly"] as const;

export default function AdminBenchmarksPage() {
  const [metric, setMetric] = useState("mrr");
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "quarterly" | "yearly">("monthly");
  const { result, loading, refetch } = useBenchmarks();

  useEffect(() => {
    refetch(metric, period);
  }, [metric, period, refetch]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-1">Benchmark Viewer</h1>
      <p className="text-text-secondary text-sm mb-6">Compare your organization against peers by metric and period.</p>

      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="text-sm text-text-secondary block mb-1">Metric</label>
          <select className="border rounded-md p-2 bg-white w-48" value={metric} onChange={(e) => setMetric(e.target.value)}>
            {METRICS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-text-secondary block mb-1">Period</label>
          <select className="border rounded-md p-2 bg-white" value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}>
            {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-text-muted">Comparing...</div>
      ) : result ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4">
              <div className="text-text-muted text-sm flex items-center gap-1"><Trophy className="w-3 h-3" /> Your Percentile</div>
              <div className="text-xl font-bold">{result.organization.percentile}%</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-text-muted text-sm">Your Value</div>
              <div className="text-xl font-bold">{result.organization.value.toLocaleString()}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-text-muted text-sm">Average</div>
              <div className="text-xl font-bold">{result.average.toLocaleString()}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-text-muted text-sm">Top Performer</div>
              <div className="text-xl font-bold">{result.topPerformer.toLocaleString()}</div>
            </CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Organization Comparison</CardTitle></CardHeader>
              <CardContent>
                <BarChartCard data={result.entries.map((e, i) => ({ idx: i, value: e.value, label: e.label }))} dataKey="value" xKey="label" label="org comparison" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Distribution</CardTitle></CardHeader>
              <CardContent>
                <PieChartCard data={result.entries.slice(0, 8).map((e) => ({ name: e.label, value: e.value }))} label="distribution" />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
