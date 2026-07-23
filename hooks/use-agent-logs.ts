"use client";

import { useState, useCallback, useEffect } from "react";
import { showError } from "@/components/ui/toast";

export interface AgentLog {
  id: string;
  agentId: string;
  runId: string | null;
  level: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export function useAgentLogs(agentId: string | null) {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  const fetchLogs = useCallback(async (reset = false) => {
    if (!agentId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (agentId) params.set("agentId", agentId);
      if (!reset && cursor) params.set("cursor", cursor);
      params.set("limit", "50");

      const res = await fetch(`/api/agents/logs?${params}`);
      const json = await res.json();
      if (res.ok) {
        if (reset) setLogs(json.data || []);
        else setLogs((prev) => [...prev, ...(json.data || [])]);
        setHasMore(json.hasMore ?? false);
        setCursor(json.nextCursor ?? null);
      } else showError(json.error || "Failed to load logs");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [agentId, cursor]);

  useEffect(() => { fetchLogs(true); }, [fetchLogs]);

  return { logs, loading, hasMore, loadMore: () => fetchLogs(false), refetch: () => fetchLogs(true) };
}
