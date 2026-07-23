"use client";

import { useState, useCallback, useEffect } from "react";
import { showError } from "@/components/ui/toast";

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  version: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
}

export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown>;
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
}

export interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string | null;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: string;
  triggerType: string | null;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  error: string | null;
  createdAt: string;
  steps?: WorkflowRunStep[];
}

export interface WorkflowRunStep {
  id: string;
  nodeId: string | null;
  nodeType: string | null;
  nodeLabel: string | null;
  status: string;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string | null;
  isBuiltIn: boolean;
  usageCount: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export function useWorkflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkflows = useCallback(async (params?: Record<string, string>) => {
    setLoading(true);
    try {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      const res = await fetch(`/api/workflows${qs}`);
      const json = await res.json();
      if (res.ok) setWorkflows(json.data || []);
      else showError(json.error || "Failed to load workflows");
    } catch (err: any) {
      showError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  return { workflows, loading, refetch: fetchWorkflows };
}

export function useWorkflow(workflowId: string | null) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchWorkflow = useCallback(async () => {
    if (!workflowId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}`);
      const json = await res.json();
      if (res.ok) setWorkflow(json.data);
      else showError(json.error || "Failed to load workflow");
    } catch (err: any) {
      showError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => { fetchWorkflow(); }, [fetchWorkflow]);

  return { workflow, loading, refetch: fetchWorkflow };
}

export function useRunWorkflow() {
  const [running, setRunning] = useState(false);

  const runWorkflow = useCallback(async (workflowId: string, triggerData?: Record<string, unknown>, background = false) => {
    setRunning(true);
    try {
      const params = new URLSearchParams({ workflowId });
      if (background) params.set("background", "true");
      const res = await fetch(`/api/workflows/run?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerData }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to run workflow");
      return json.data;
    } catch (err: any) {
      showError(err.message);
      throw err;
    } finally {
      setRunning(false);
    }
  }, []);

  return { runWorkflow, running };
}

export function useWorkflowHistory(workflowId?: string | null) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  const fetchHistory = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (workflowId) params.set("workflowId", workflowId);
      if (!reset && cursor) params.set("cursor", cursor);
      params.set("limit", "20");

      const res = await fetch(`/api/workflows/history?${params}`);
      const json = await res.json();
      if (res.ok) {
        if (reset) setRuns(json.data || []);
        else setRuns((prev) => [...prev, ...(json.data || [])]);
        setHasMore(json.hasMore ?? false);
        setCursor(json.nextCursor ?? null);
      } else showError(json.error || "Failed to load history");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [workflowId, cursor]);

  useEffect(() => { fetchHistory(true); }, [fetchHistory]);

  return { runs, loading, hasMore, loadMore: () => fetchHistory(false), refetch: () => fetchHistory(true) };
}

export function useWorkflowTemplates() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async (category?: string) => {
    setLoading(true);
    try {
      const params = category ? `?category=${category}` : "";
      const res = await fetch(`/api/workflows/templates${params}`);
      const json = await res.json();
      if (res.ok) setTemplates(json.data || []);
      else showError(json.error || "Failed to load templates");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  return { templates, loading, refetch: fetchTemplates };
}

export function useWorkflowLogs(workflowId?: string | null) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!workflowId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workflows/logs?workflowId=${workflowId}`);
      const json = await res.json();
      if (res.ok) setLogs(json.data || []);
      else showError(json.error || "Failed to load logs");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return { logs, loading, refetch: fetchLogs };
}

export function useWorkflowSchedules(workflowId?: string | null) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    if (!workflowId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workflows/schedules?workflowId=${workflowId}`);
      const json = await res.json();
      if (res.ok) setSchedules(json.data || []);
      else showError(json.error || "Failed to load schedules");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  return { schedules, loading, refetch: fetchSchedules };
}
