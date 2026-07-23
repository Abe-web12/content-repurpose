"use client";

import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyPoint } from "@/hooks/use-analytics";

interface ForecastPoint {
  date: string;
  count: number;
}
import { DailyChart } from "./daily-chart";

interface ForecastPanelProps {
  history: DailyPoint[];
  forecast: ForecastPoint[];
}

export function ForecastPanel({ history, forecast }: ForecastPanelProps) {
  const total = forecast.reduce((s, f) => s + f.count, 0);
  const avg =
    forecast.length > 0 ? Number((total / forecast.length).toFixed(1)) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-purple-500" />
          7-Day Forecast
        </CardTitle>
        <div className="text-right">
          <p className="text-xs text-text-muted">Projected total</p>
          <p className="text-lg font-bold text-text-primary">{total}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <DailyChart series={history.slice(-14)} forecast={forecast} />

        <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface-1 p-4">
          <div>
            <p className="text-xs text-text-muted">Avg / day (forecast)</p>
            <p className="text-xl font-bold text-text-primary">{avg}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Days forecasted</p>
            <p className="text-xl font-bold text-text-primary">{forecast.length}</p>
          </div>
        </div>

        <div className="space-y-1">
          {forecast.map((f) => (
            <div
              key={f.date}
              className="flex items-center justify-between rounded-md px-3 py-1.5 hover:bg-surface-1"
            >
              <span className="text-xs text-text-secondary">
                {new Date(f.date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="text-xs font-medium text-purple-600">
                ~{f.count} generation{f.count !== 1 ? "s" : ""}
              </span>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-text-muted">
          Forecast uses linear trend extrapolation from the last 14 days of
          activity. Accuracy improves with more historical data.
        </p>
      </CardContent>
    </Card>
  );
}