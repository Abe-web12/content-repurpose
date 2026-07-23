"use client";

import { useState, useCallback } from "react";
import { showError } from "@/components/ui/toast";

export interface BenchmarkResult {
  metric: string;
  period: string;
  organization: { value: number; percentile: number };
  entries: { label: string; value: number; percentage: number; trend: "up" | "down" | "stable" }[];
  average: number;
  median: number;
  topPerformer: number;
}

export function useBenchmarks(organizationId?: string) {
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(
    async (metric = "mrr", period: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" = "monthly") => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (organizationId) qs.set("organizationId", organizationId);
        qs.set("metric", metric);
        qs.set("period", period);
        const res = await fetch(`/api/analytics/benchmarks?${qs.toString()}`);
        const json = await res.json();
        if (res.ok) {
          setResult(json.data);
        } else {
          showError(json.error || "Failed to load benchmarks");
        }
      } catch (err) {
        showError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    },
    [organizationId]
  );

  return { result, loading, refetch: fetchData };
}
