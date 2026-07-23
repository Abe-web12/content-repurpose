"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BenchmarkCardProps {
  metric: string;
  orgValue: number;
  percentile: number;
  average: number;
  median: number;
  topPerformer: number;
}

export function BenchmarkCard({ metric, orgValue, percentile, average, median, topPerformer }: BenchmarkCardProps) {
  const label = metric.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const aboveAvg = orgValue >= average;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Your Value</span>
          <span className="text-lg font-bold text-text-primary">{orgValue.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Percentile</span>
          <span className={cn("text-sm font-semibold", percentile >= 50 ? "text-green-600" : "text-red-500")}>
            {percentile}th
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Average</span>
          <span className="text-sm">{average.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Median</span>
          <span className="text-sm">{median.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Top Performer</span>
          <span className="text-sm font-medium">{topPerformer.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1 pt-1">
          {aboveAvg ? <TrendingUp className="h-3 w-3 text-green-600" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
          <span className={cn("text-xs", aboveAvg ? "text-green-600" : "text-red-500")}>
            {aboveAvg ? "Above" : "Below"} average
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
