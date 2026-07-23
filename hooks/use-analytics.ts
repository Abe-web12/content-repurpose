"use client";

import { useState, useCallback, useEffect } from "react";
import { showError } from "@/components/ui/toast";
import { useAuth } from "@/components/providers/auth-provider";

export interface AnalyticsOverview {
  totalGenerations: number;
  changePct: number;
  tokensUsed: number;
  tokensChangePct: number;
  creditsUsed: number;
  topFormat: string | null;
  avgPerDay: number;
  avgPerDayPrevious: number;
}

export interface DailyPoint {
  date: string;
  count: number;
}

export interface AnalyticsData {
  overview: AnalyticsOverview;
  formatBreakdown: Record<string, number>;
  dailySeries: DailyPoint[];
  alerts: { type: "info" | "warning" | "error"; message: string }[];
  forecast: { date: string; count: number }[];
  benchmarks: { avgPerDay: number; avgPerDayPrevious: number; totalCurrent: number; totalPrevious: number; periodDays: number };
  usage?: { used: number; limit: number; plan: string };
  totalGenerations?: number;
  totalScheduled?: number;
  totalPublished?: number;
  monthlyTrend?: { date: string; count: number }[];
  platformBreakdown?: { name: string; value: number }[];
}

export interface RevenueDataPoint {
  date: string;
  mrr: number;
  arr: number;
  grossRevenue: number;
  netRevenue: number;
  expansionRevenue: number;
  contractionRevenue: number;
}

export interface UserGrowthPoint {
  date: string;
  activeCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
  totalCustomers: number;
}

export interface ContentMetrics {
  totalGenerations: number;
  totalTokens: number;
  favoriteCount: number;
  byFormat: Record<string, number>;
  byInputType: Record<string, number>;
  byModel: Record<string, number>;
  dailySeries: DailyPoint[];
}

export interface AIMetrics {
  metrics: Array<{ date: string; requests: number; tokens: number; cost: number; latency: number; successRate: number }>;
  providers: Array<{ providerId: string; model: string; requests: number; tokens: number; cost: number }>;
  overview: { totalRequests: number; totalTokens: number; totalCost: number; averageLatency: number; successRate: number };
}

export interface WorkflowMetrics {
  date: string;
  runs: number;
  successCount: number;
  failedCount: number;
  avgDuration: number;
}

export interface ForecastPoint {
  date: string;
  actual?: number;
  predicted: number;
  lowerBound: number;
  upperBound: number;
}

export interface ForecastResult {
  metric: string;
  period: string;
  predictions: ForecastPoint[];
  trend: "up" | "down" | "stable";
  confidence: number;
  growth: number;
}

export interface BenchmarkEntry {
  label: string;
  value: number;
  percentage: number;
  trend: "up" | "down" | "stable";
}

export interface BenchmarkResult {
  metric: string;
  period: string;
  organization: { value: number; percentile: number };
  entries: BenchmarkEntry[];
  average: number;
  median: number;
  topPerformer: number;
}

export interface AlertRecord {
  id: string;
  name: string;
  metric: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  lastTriggered: string | null;
}

export type AnalyticsAlert = { type: "info" | "warning" | "error"; message: string };

export interface AlertEvent {
  id: string;
  alertId: string;
  alertName: string;
  metric: string;
  value: number;
  threshold: number;
  condition: string;
  status: string;
  message: string;
  createdAt: string;
  triggeredAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

export interface Benchmarks {
  avgPerDay: number;
  avgPerDayPrevious: number;
  totalCurrent: number;
  totalPrevious: number;
  periodDays: number;
}

export function useAnalytics(days = 30) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/overview?days=${days}`);
      const json = await res.json();
      if (!res.ok) {
        const msg = json.error || "Failed to load analytics";
        setError(msg);
        showError(msg);
        return;
      }
      setData(json.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error, refresh: fetch_ };
}

export function useRevenue(organizationId?: string, period: "7d" | "30d" | "90d" | "365d" = "30d") {
  const { organizationId: authOrgId } = useAuth();
  const orgId = organizationId ?? authOrgId;
  const [revenue, setRevenue] = useState<RevenueDataPoint[]>([]);
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (orgId) qs.set("organizationId", orgId);
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
  }, [orgId, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { revenue, metrics, loading, refetch: fetchData };
}

export function useUserGrowth(organizationId?: string, period: "7d" | "30d" | "90d" | "365d" = "30d") {
  const { organizationId: authOrgId } = useAuth();
  const orgId = organizationId ?? authOrgId;
  const [growth, setGrowth] = useState<UserGrowthPoint[]>([]);
  const [segments, setSegments] = useState<Array<{ name: string; count: number; percentage: number; description: string }>>([]);
  const [retentionRate, setRetentionRate] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (orgId) qs.set("organizationId", orgId);
      qs.set("period", period);
      const res = await fetch(`/api/analytics/users?${qs.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setGrowth(json.data.growth);
        setSegments(json.data.segments);
        setRetentionRate(json.data.retentionRate);
      } else {
        showError(json.error || "Failed to load user growth");
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [orgId, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { growth, segments, retentionRate, loading, refetch: fetchData };
}

export function useContentMetrics(days = 30) {
  const [data, setData] = useState<ContentMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/content?days=${days}`);
      const json = await res.json();
      if (res.ok) setData(json.data);
      else showError(json.error || "Failed to load content metrics");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, refetch: fetchData };
}

export function useAIUsage(organizationId?: string, period: "7d" | "30d" | "90d" | "365d" = "30d") {
  const { organizationId: authOrgId } = useAuth();
  const orgId = organizationId ?? authOrgId;
  const [metrics, setMetrics] = useState<AIMetrics["metrics"]>([]);
  const [providers, setProviders] = useState<AIMetrics["providers"]>([]);
  const [overview, setOverview] = useState<AIMetrics["overview"] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (orgId) qs.set("organizationId", orgId);
      qs.set("period", period);
      const res = await fetch(`/api/analytics/ai?${qs.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setMetrics(json.data.metrics);
        setProviders(json.data.providers);
        setOverview(json.data.overview);
      } else {
        showError(json.error || "Failed to load AI usage");
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [orgId, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { metrics, providers, overview, loading, refetch: fetchData };
}

export function useWorkflowMetrics(organizationId?: string, period: "7d" | "30d" | "90d" | "365d" = "30d") {
  const { organizationId: authOrgId } = useAuth();
  const orgId = organizationId ?? authOrgId;
  const [data, setData] = useState<WorkflowMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (orgId) qs.set("organizationId", orgId);
      qs.set("period", period);
      const res = await fetch(`/api/analytics/workflows?${qs.toString()}`);
      const json = await res.json();
      if (res.ok) setData(json.data);
      else showError(json.error || "Failed to load workflow metrics");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [orgId, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, refetch: fetchData };
}

export function useForecast(organizationId?: string, metric = "revenue", days: "7" | "30" | "90" | "365" = "30") {
  const { organizationId: authOrgId } = useAuth();
  const orgId = organizationId ?? authOrgId;
  const [prediction, setPrediction] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (orgId) qs.set("organizationId", orgId);
      qs.set("metric", metric);
      qs.set("days", days);
      const res = await fetch(`/api/analytics/forecast?${qs.toString()}`);
      const json = await res.json();
      if (res.ok) setPrediction(json.data);
      else showError(json.error || "Failed to load forecast");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [orgId, metric, days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { prediction, loading, refetch: fetchData };
}

export function useBenchmarks(organizationId?: string) {
  const { organizationId: authOrgId } = useAuth();
  const orgId = organizationId ?? authOrgId;
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (metric = "mrr", period: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" = "monthly") => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (orgId) qs.set("organizationId", orgId);
      qs.set("metric", metric);
      qs.set("period", period);
      const res = await fetch(`/api/analytics/benchmarks?${qs.toString()}`);
      const json = await res.json();
      if (res.ok) setResult(json.data);
      else showError(json.error || "Failed to load benchmarks");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  return { result, loading, refetch: fetchData };
}

export function useAlerts(organizationId?: string) {
  const { organizationId: authOrgId } = useAuth();
  const orgId = organizationId ?? authOrgId;
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [history, setHistory] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = orgId ? `?organizationId=${orgId}` : "";
      const res = await fetch(`/api/analytics/alerts${qs}`);
      const json = await res.json();
      if (res.ok) {
        setAlerts(json.data);
        setHistory(json.history);
      } else {
        showError(json.error || "Failed to load alerts");
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const createAlert = useCallback(async (input: {
    name: string; metric: string; condition: string; threshold: number;
    description?: string; window?: number; channels?: string[];
  }) => {
    setCreating(true);
    try {
      const qs = orgId ? `?organizationId=${orgId}` : "";
      const res = await fetch(`/api/analytics/alerts${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        showError(json.error || "Failed to create alert");
        return null;
      }
      await fetchData();
      return json.data;
    } catch (err) {
      showError(err instanceof Error ? err.message : "Network error");
      return null;
    } finally {
      setCreating(false);
    }
  }, [orgId, fetchData]);

  const actOnEvent = useCallback(async (id: string, action: "acknowledge" | "resolve") => {
    try {
      const res = await fetch(`/api/analytics/alerts/${id}?action=${action}`, { method: "POST" });
      if (res.ok) { await fetchData(); return true; }
      return false;
    } catch { return false; }
  }, [fetchData]);

  return { alerts, history, loading, creating, fetchData, createAlert, actOnEvent };
}

export function useExport(organizationId?: string) {
  const { organizationId: authOrgId } = useAuth();
  const orgId = organizationId ?? authOrgId;
  const [loading, setLoading] = useState(false);

  const exportData = useCallback(async (type: string, format: "csv" | "json") => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (orgId) qs.set("organizationId", orgId);
      qs.set("type", type);
      qs.set("format", format);
      const res = await fetch(`/api/analytics/export?${qs.toString()}`);
      if (!res.ok) {
        const json = await res.json();
        showError(json.error || "Failed to export");
        return;
      }
      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition") || `attachment; filename=${type}.${format}`;
      const filename = contentDisposition.split("filename=")[1]?.replace(/"/g, "") || `${type}.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  return { loading, exportData };
}
