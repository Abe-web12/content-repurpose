"use client";

import { useState, useCallback, useEffect } from "react";
import { showError } from "@/components/ui/toast";

export interface AIProvider {
  id: string;
  name: string;
  displayName: string;
  type: string;
  baseUrl: string | null;
  defaultModel: string;
  models: string[];
  capabilities: string[];
  priority: number;
  isEnabled: boolean;
  config: Record<string, unknown> | null;
  health?: {
    status: string;
    latency: number;
    errorRate: number;
    successRate: number;
    totalCalls: number;
  } | null;
}

export interface AIModel {
  id: string;
  name: string;
  displayName: string;
  providerId: string;
  capabilities: string[];
  contextWindow: number;
  maxTokens: number;
  costPerInput: number;
  costPerOutput: number;
  isEnabled: boolean;
}

export interface AIUsage {
  date: string;
  totalTokens: number;
  estimatedCost: number;
  requestCount: number;
  promptTokens: number;
  completionTokens: number;
}

export interface AIAnalyticsData {
  requests: {
    totalRequests: number;
    completedRequests: number;
    failedRequests: number;
    successRate: number;
    failureRate: number;
    averageLatency: number;
    totalCost: number;
    averageCost: number;
  };
  providerUsage: Array<{
    provider: { id: string; name: string; displayName: string };
    totalTokens: number;
    totalCost: number;
    requestCount: number;
  }>;
  modelUsage: Array<{
    model: string;
    totalTokens: number;
    totalCost: number;
    requestCount: number;
  }>;
  period: string;
}

export function useAIProviders() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/providers");
      const json = await res.json();
      if (res.ok) setProviders(json.data);
      else showError(json.error || "Failed to load providers");
    } catch (err: any) {
      showError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  return { providers, loading, refetch: fetchProviders };
}

export function useAIModels(providerId?: string) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const params = providerId ? `?providerId=${providerId}` : "";
      const res = await fetch(`/api/ai/models${params}`);
      const json = await res.json();
      if (res.ok) setModels(json.data);
      else showError(json.error || "Failed to load models");
    } catch (err: any) {
      showError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  return { models, loading, refetch: fetchModels };
}

export function useAIUsage(options?: { providerId?: string; days?: number }) {
  const [usage, setUsage] = useState<AIUsage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (options?.providerId) params.set("providerId", options.providerId);
      if (options?.days) params.set("days", String(options.days));
      const res = await fetch(`/api/ai/usage?${params}`);
      const json = await res.json();
      if (res.ok) setUsage(json.data);
      else showError(json.error || "Failed to load usage");
    } catch (err: any) {
      showError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [options?.providerId, options?.days]);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  return { usage, loading, refetch: fetchUsage };
}

export function useAIHealth() {
  const [healthData, setHealthData] = useState<Array<{ provider: string; health: any }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/health");
      const json = await res.json();
      if (res.ok) setHealthData(json.data);
      else showError(json.error || "Failed to load health");
    } catch (err: any) {
      showError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  return { healthData, loading, refetch: fetchHealth };
}

export function useAIAnalytics(period?: string) {
  const [data, setData] = useState<AIAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = period ? `?period=${period}` : "";
      const res = await fetch(`/api/ai/analytics${params}`);
      const json = await res.json();
      if (res.ok) setData(json.data);
      else showError(json.error || "Failed to load analytics");
    } catch (err: any) {
      showError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  return { data, loading, refetch: fetchAnalytics };
}
