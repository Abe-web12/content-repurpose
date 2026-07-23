"use client";

import { useState, useCallback } from "react";
import { showError } from "@/components/ui/toast";

export interface ExecutiveMetrics {
  mrr: number;
  arr: number;
  netRevenue: number;
  grossRevenue: number;
  activeCustomers: number;
  newCustomers: number;
  churnRate: number;
  expansionRevenue: number;
  contractionRevenue: number;
  ltv: number;
  cac: number;
  paybackPeriod: number;
  activeOrganizations: number;
  apiUsage: number;
  aiUsage: number;
  creditConsumption: number;
  storageUsage: number;
  workflowExecutions: number;
  aiProviderUsage: Record<string, number>;
  marketplaceInstalls: number;
}

export interface RealtimeSnapshot {
  activeUsers: number;
  requestsPerMinute: number;
  aiRequestsPerMinute: number;
  workflowRunsPerMinute: number;
  creditConsumedPerMinute: number;
  recentEvents: { id: string; type: string; payload: Record<string, unknown>; createdAt: string }[];
  updatedAt: string;
}

export function useExecutiveDashboard(organizationId?: string) {
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);
  const [realtime, setRealtime] = useState<RealtimeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = organizationId ? `?organizationId=${organizationId}` : "";
      const res = await fetch(`/api/analytics/executive${qs}`);
      const json = await res.json();
      if (res.ok) {
        setMetrics(json.data.metrics);
        setRealtime(json.data.realtime);
      } else {
        showError(json.error || "Failed to load executive metrics");
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  return { metrics, realtime, loading, refetch: fetchData };
}
