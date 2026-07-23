"use client";

import { useState, useCallback, useEffect } from "react";
import { showError } from "@/components/ui/toast";

export interface AgentSchedule {
  id: string;
  agentId: string;
  cron: string;
  input: Record<string, unknown> | null;
  enabled: boolean;
  lastFiredAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
}

export function useAgentSchedules(agentId: string | null) {
  const [schedules, setSchedules] = useState<AgentSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSchedules = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/schedules?agentId=${agentId}`);
      const json = await res.json();
      if (res.ok) setSchedules(json.data || []);
      else showError(json.error || "Failed to load schedules");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const createSchedule = useCallback(async (data: { cron: string; input?: Record<string, unknown> }) => {
    try {
      const res = await fetch("/api/agents/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, ...data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create schedule");
      setSchedules((prev) => [...prev, json.data]);
      return json.data;
    } catch (err: any) {
      showError(err.message);
      throw err;
    }
  }, [agentId]);

  const toggleSchedule = useCallback(async (scheduleId: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/agents/schedules/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update schedule");
      setSchedules((prev) => prev.map((s) => (s.id === scheduleId ? { ...s, enabled } : s)));
      return json.data;
    } catch (err: any) {
      showError(err.message);
      throw err;
    }
  }, []);

  const deleteSchedule = useCallback(async (scheduleId: string) => {
    try {
      const res = await fetch(`/api/agents/schedules/${scheduleId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete schedule");
      }
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    } catch (err: any) {
      showError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  return { schedules, loading, refetch: fetchSchedules, createSchedule, toggleSchedule, deleteSchedule };
}
