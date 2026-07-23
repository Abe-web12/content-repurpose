"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePredictions } from "@/hooks/use-predictions";
import { ForecastChart } from "@/components/charts";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";

const METRICS = ["mrr", "arr", "revenue", "churn", "ltv", "credits", "storage", "workflows", "api_usage", "organizations"];
const HORIZONS = ["7", "30", "90", "365"] as const;

export default function AdminPredictionsPage() {
  const [metric, setMetric] = useState("mrr");
  const [days, setDays] = useState<"7" | "30" | "90" | "365">("30");
  const { prediction, loading, refetch } = usePredictions(undefined, metric, days);

  useEffect(() => {
    refetch();
  }, [metric, days, refetch]);

  const trend = prediction?.trend;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-1">Predictive AI</h1>
      <p className="text-text-secondary text-sm mb-6">Forecast revenue, churn, growth and usage with confidence intervals.</p>

      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="text-sm text-text-secondary block mb-1">Metric</label>
          <select className="border rounded-md p-2 bg-white w-48" value={metric} onChange={(e) => setMetric(e.target.value)}>
            {METRICS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-text-secondary block mb-1">Horizon</label>
          <div className="flex gap-1">
            {HORIZONS.map((h) => (
              <Button key={h} size="sm" variant={days === h ? "default" : "outline"} onClick={() => setDays(h)}>{h}d</Button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-text-muted">Forecasting...</div>
      ) : prediction ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4">
              <div className="text-text-muted text-sm">Trend</div>
              <div className={`text-xl font-bold flex items-center gap-1 ${trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-text-primary"}`}>
                {trend === "up" ? <TrendingUp className="w-4 h-4" /> : trend === "down" ? <TrendingDown className="w-4 h-4" /> : null}
                {trend}
              </div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-text-muted text-sm">Projected Growth</div>
              <div className="text-xl font-bold">{prediction.growth}%</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-text-muted text-sm">Confidence</div>
              <div className="text-xl font-bold">{prediction.confidence}%</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-text-muted text-sm">R² Fit</div>
              <div className="text-xl font-bold">{prediction.metadata.rSquared}</div>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-4 h-4" /> {metric.toUpperCase()} Forecast — next {days} days</CardTitle></CardHeader>
            <CardContent>
              <ForecastChart data={prediction.predictions} label={`${metric} forecast`} />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
