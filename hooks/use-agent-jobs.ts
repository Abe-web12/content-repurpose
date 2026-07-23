"use client";

import { useState, useCallback, useEffect } from "react";
import { showError } from "@/components/ui/toast";

export interface BackgroundJob {
  id: string;
  agentId: string;
  input: Record<string, unknown>;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  progressMessage: string;
  result?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export function useAgentJobs(agentId: string | null) {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchJobs = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/background?agentId=${agentId}`);
      const json = await res.json();
      if (res.ok) setJobs(json.data || []);
      else showError(json.error || "Failed to load jobs");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const enqueueJob = useCallback(async (input: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/agents/background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, input }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to enqueue job");
      setJobs((prev) => [json.data, ...prev]);
      return json.data;
    } catch (err: any) {
      showError(err.message);
      throw err;
    }
  }, [agentId]);

  const cancelJob = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/agents/background/${jobId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to cancel job");
      }
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "cancelled" as const } : j)));
    } catch (err: any) {
      showError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  return { jobs, loading, refetch: fetchJobs, enqueueJob, cancelJob };
}
