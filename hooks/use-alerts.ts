"use client";

import { useState, useCallback } from "react";
import { showError } from "@/components/ui/toast";

export interface AlertRecord {
  id: string;
  name: string;
  metric: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  lastTriggeredAt: string | null;
}

export interface AlertEvent {
  id: string;
  metric: string;
  value: number;
  condition: string;
  threshold: number;
  message: string;
  status: string;
  createdAt: string;
}

export function useAlerts(organizationId?: string) {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [history, setHistory] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = organizationId ? `?organizationId=${organizationId}` : "";
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
  }, [organizationId]);

  const createAlert = useCallback(
    async (input: {
      name: string;
      metric: string;
      condition: string;
      threshold: number;
      description?: string;
      window?: number;
      channels?: string[];
    }) => {
      setCreating(true);
      try {
        const qs = organizationId ? `?organizationId=${organizationId}` : "";
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
    },
    [organizationId, fetchData]
  );

  const actOnEvent = useCallback(
    async (id: string, action: "acknowledge" | "resolve") => {
      try {
        const res = await fetch(`/api/analytics/alerts/${id}?action=${action}`, { method: "POST" });
        if (res.ok) {
          await fetchData();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [fetchData]
  );

  return { alerts, history, loading, creating, fetchData, createAlert, actOnEvent };
}
