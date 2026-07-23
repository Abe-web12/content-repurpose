"use client";

import { useState, useCallback } from "react";
import { showError } from "@/components/ui/toast";

export interface ToolExecutionResult {
  output: string;
  duration: number;
  success: boolean;
  error?: string;
}

export function useExecuteTool() {
  const [executing, setExecuting] = useState(false);

  const executeTool = useCallback(async (
    agentId: string,
    toolType: string,
    toolName: string,
    input: Record<string, unknown>
  ) => {
    setExecuting(true);
    try {
      const res = await fetch("/api/agents/tools/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, toolType, toolName, input }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Tool execution failed");
      return json.data as ToolExecutionResult;
    } catch (err: any) {
      showError(err.message);
      throw err;
    } finally {
      setExecuting(false);
    }
  }, []);

  return { executeTool, executing };
}

export function useToolLogs(agentId: string | null) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/tools/logs?agentId=${agentId}`);
      const json = await res.json();
      if (res.ok) setLogs(json.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  return { logs, loading, refetch: fetchLogs };
}
