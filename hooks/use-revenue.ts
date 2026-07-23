"use client";

import { useState, useCallback } from "react";
import { showError } from "@/components/ui/toast";

export interface RevenueDataPoint {
  date: string;
  mrr: number;
  arr: number;
  grossRevenue: number;
  netRevenue: number;
  expansionRevenue: number;
  contractionRevenue: number;
}

export function useRevenue(organizationId?: string, period: "7d" | "30d" | "90d" | "365d" = "30d") {
  const [revenue, setRevenue] = useState<RevenueDataPoint[]>([]);
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (organizationId) qs.set("organizationId", organizationId);
      qs.set("period", period);
      const res = await fetch(`/api/analytics/revenue?${qs.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setRevenue(json.data.revenue);
        setMetrics(json.data.metrics);
      } else {
        showError(json.error || "Failed to load revenue");
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [organizationId, period]);

  return { revenue, metrics, loading, refetch: fetchData };
}
