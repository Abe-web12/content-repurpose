"use client";

import { useMemo } from "react";
import type { AIUsage } from "@/hooks/use-ai";

interface UsageChartProps {
  data: AIUsage[];
  metric?: "totalTokens" | "estimatedCost" | "requestCount";
}

export function UsageChart({ data, metric = "totalTokens" }: UsageChartProps) {
  const maxVal = useMemo(() => Math.max(...data.map((d) => d[metric]), 1), [data, metric]);

  if (data.length === 0) {
    return <div className="text-center text-gray-400 py-8">No usage data available</div>;
  }

  const label = metric === "totalTokens" ? "Tokens" : metric === "estimatedCost" ? "Cost (USD)" : "Requests";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        <span className="text-xs text-gray-400">Last {data.length} days</span>
      </div>
      <div className="flex items-end gap-1 h-32">
        {data.map((d, i) => {
          const h = maxVal > 0 ? (d[metric] / maxVal) * 100 : 0;
          return (
            <div key={d.date || i} className="flex-1 flex flex-col items-center group relative">
              <div
                className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                style={{ height: `${Math.max(h, 1)}%` }}
                title={`${d.date}: ${d[metric].toFixed(2)}`}
              />
              {data.length <= 14 && (
                <span className="text-[10px] text-gray-400 mt-1 truncate w-full text-center">
                  {new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
