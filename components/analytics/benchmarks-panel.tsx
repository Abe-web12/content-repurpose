"use client";

import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Benchmarks } from "@/hooks/use-analytics";

interface BenchmarksPanelProps {
  benchmarks: Benchmarks;
}

interface BenchmarkRow {
  label: string;
  current: number | string;
  previous: number | string;
  unit?: string;
  higherIsBetter?: boolean;
}

export function BenchmarksPanel({ benchmarks }: BenchmarksPanelProps) {
  const { avgPerDay, avgPerDayPrevious, totalCurrent, totalPrevious, periodDays } =
    benchmarks;

  const rows: BenchmarkRow[] = [
    {
      label: "Total generations",
      current: totalCurrent,
      previous: totalPrevious,
      higherIsBetter: true,
    },
    {
      label: "Avg / day",
      current: avgPerDay,
      previous: avgPerDayPrevious,
      higherIsBetter: true,
    },
    {
      label: "Period (days)",
      current: periodDays,
      previous: periodDays,
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <BarChart3 className="h-4 w-4 text-brand-600" />
        <CardTitle className="text-sm font-semibold">
          Period Benchmarks
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-xl border border-surface-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-1 text-left">
                <th className="px-4 py-2.5 text-xs font-medium text-text-muted">
                  Metric
                </th>
                <th className="px-4 py-2.5 text-xs font-medium text-text-muted">
                  This period
                </th>
                <th className="px-4 py-2.5 text-xs font-medium text-text-muted">
                  Previous
                </th>
                <th className="px-4 py-2.5 text-xs font-medium text-text-muted">
                  Δ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-3">
              {rows.map((row) => {
                const cur = Number(row.current);
                const prev = Number(row.previous);
                const delta = cur - prev;
                const pct =
                  prev !== 0 ? Math.round((delta / prev) * 100) : null;
                const positive = delta > 0;
                const negative = delta < 0;

                return (
                  <tr key={row.label} className="transition-colors hover:bg-surface-1/50">
                    <td className="px-4 py-3 text-xs font-medium text-text-primary">
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-primary font-semibold">
                      {row.current}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {row.previous}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {pct !== null ? (
                        <span
                          className={cn(
                            "font-medium",
                            row.higherIsBetter
                              ? positive
                                ? "text-green-600"
                                : negative
                                ? "text-red-500"
                                : "text-text-muted"
                              : positive
                              ? "text-red-500"
                              : negative
                              ? "text-green-600"
                              : "text-text-muted"
                          )}
                        >
                          {delta >= 0 ? "+" : ""}
                          {pct}%
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[10px] text-text-muted">
          Previous period covers the same number of days immediately before this
          period.
        </p>
      </CardContent>
    </Card>
  );
}