"use client";

import { useState, useCallback } from "react";
import { showError } from "@/components/ui/toast";

export interface CustomerSegmentResult {
  name: string;
  count: number;
  percentage: number;
  revenue: number;
  description: string;
}

export interface CohortRow {
  period: string;
  customers: number;
  periods: { index: number; retention: number; revenue: number }[];
}

export function useCustomers(organizationId?: string, period: "7d" | "30d" | "90d" | "365d" = "30d") {
  const [segments, setSegments] = useState<CustomerSegmentResult[]>([]);
  const [funnel, setFunnel] = useState<{ stage: string; count: number; conversion: number }[]>([]);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [behavior, setBehavior] = useState<{ date: string; activeUsers: number; generations: number; publishes: number }[]>([]);
  const [lifetime, setLifetime] = useState<{ data: unknown[]; nextCursor: string | null }>({ data: [], nextCursor: null });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (organizationId) qs.set("organizationId", organizationId);
      qs.set("period", period);
      const res = await fetch(`/api/analytics/customers?${qs.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setSegments(json.data.segments);
        setFunnel(json.data.funnel);
        setCohorts(json.data.cohorts);
        setBehavior(json.data.behavior);
        setLifetime({ data: json.data.lifetime.data, nextCursor: json.data.lifetime.nextCursor });
      } else {
        showError(json.error || "Failed to load customers");
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [organizationId, period]);

  return { segments, funnel, cohorts, behavior, lifetime, loading, refetch: fetchData };
}
