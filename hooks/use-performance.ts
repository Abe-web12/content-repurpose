"use client";

import { useState, useCallback } from "react";
import { showError } from "@/components/ui/toast";

export interface PerformanceMetric {
  apiLatency: number;
  dbQueries: number;
  cacheHitRatio: number;
  queueProcessing: number;
  backgroundJobs: number;
  searchPerformance: number;
  uploadPerformance: number;
  responseTime: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
}

export function usePerformance(organizationId?: string) {
  const [metrics, setMetrics] = useState<PerformanceMetric | null>(null);
  const [series, setSeries] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(
    async (minutes = 60) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (organizationId) qs.set("organizationId", organizationId);
        qs.set("minutes", String(minutes));
        const res = await fetch(`/api/analytics/performance?${qs.toString()}`);
        const json = await res.json();
        if (res.ok) {
          setMetrics(json.data.metrics);
          setSeries(json.data.series);
        } else {
          showError(json.error || "Failed to load performance");
        }
      } catch (err) {
        showError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    },
    [organizationId]
  );

  return { metrics, series, loading, refetch: fetchData };
}
