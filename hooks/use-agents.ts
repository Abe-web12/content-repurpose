"use client";

import { useState, useCallback, useEffect } from "react";
import { showError } from "@/components/ui/toast";

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  status: string;
  visibility: string;
  model: string;
  provider: string;
  temperature: number | null;
  maxTokens: number | null;
  systemPrompt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRun {
  id: string;
  agentId: string;
  status: string;
  triggerType: string | null;
  input: string | null;
  output: string | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  tokensUsed: number | null;
  cost: number | null;
  createdAt: string;
}

export interface AgentMemory {
  id: string;
  agentId: string;
  type: string;
  key: string;
  content: string;
  summary: string | null;
  score: number | null;
  createdAt: string;
}

export interface AgentKnowledgeBase {
  id: string;
  agentId: string;
  name: string;
  description: string | null;
  documentCount: number;
  createdAt: string;
}

export interface AgentKnowledgeDocument {
  id: string;
  knowledgeBaseId: string;
  title: string;
  source: string;
  sourceType: string;
  createdAt: string;
}

export interface AgentTool {
  id: string;
  agentId: string;
  type: string;
  name: string;
  description: string | null;
  enabled: boolean;
  config: Record<string, unknown> | null;
  createdAt: string;
}

export interface AgentTask {
  id: string;
  agentId: string;
  runId: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  toolType: string | null;
  error: string | null;
  createdAt: string;
}

export interface AgentConversation {
  id: string;
  agentId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentMessage {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  toolCalls: Record<string, unknown> | null;
  createdAt: string;
}

export interface AgentAnalytics {
  totalRuns: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgDuration: number | null;
  totalTokens: number;
  totalCost: number;
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async (params?: Record<string, string>) => {
    setLoading(true);
    try {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      const res = await fetch(`/api/agents${qs}`);
      const json = await res.json();
      if (res.ok) setAgents(json.data || []);
      else showError(json.error || "Failed to load agents");
    } catch (err: any) {
      showError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  return { agents, loading, refetch: fetchAgents };
}

export function useAgent(agentId: string | null) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAgent = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      const json = await res.json();
      if (res.ok) setAgent(json.data);
      else showError(json.error || "Failed to load agent");
    } catch (err: any) {
      showError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { fetchAgent(); }, [fetchAgent]);

  return { agent, loading, refetch: fetchAgent };
}

export function useAgentChat() {
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (agentId: string, message: string, conversationId?: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, message, conversationId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send message");
      return json.data;
    } catch (err: any) {
      showError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { sendMessage, loading };
}

export function useMemory(agentId: string | null) {
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMemories = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/memory?agentId=${agentId}`);
      const json = await res.json();
      if (res.ok) setMemories(json.data || []);
      else showError(json.error || "Failed to load memories");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const storeMemory = useCallback(async (key: string, content: string, type = "general") => {
    try {
      const res = await fetch("/api/agents/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, key, content, type }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to store memory");
      setMemories((prev) => [...prev, json.data]);
      return json.data;
    } catch (err: any) {
      showError(err.message);
      throw err;
    }
  }, [agentId]);

  const pruneMemory = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/memory/prune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to prune memory");
      setMemories(json.data || []);
      return json.data;
    } catch (err: any) {
      showError(err.message);
      throw err;
    }
  }, [agentId]);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  return { memories, loading, refetch: fetchMemories, storeMemory, pruneMemory };
}

export function useKnowledge(agentId: string | null) {
  const [knowledgeBases, setKnowledgeBases] = useState<AgentKnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchKnowledgeBases = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/knowledge?agentId=${agentId}`);
      const json = await res.json();
      if (res.ok) setKnowledgeBases(json.data || []);
      else showError(json.error || "Failed to load knowledge bases");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { fetchKnowledgeBases(); }, [fetchKnowledgeBases]);

  return { knowledgeBases, loading, refetch: fetchKnowledgeBases };
}

export function useTasks(agentId: string | null) {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/tasks?agentId=${agentId}`);
      const json = await res.json();
      if (res.ok) setTasks(json.data || []);
      else showError(json.error || "Failed to load tasks");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  return { tasks, loading, refetch: fetchTasks };
}

export function useTools(agentId: string | null) {
  const [tools, setTools] = useState<AgentTool[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTools = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/tools?agentId=${agentId}`);
      const json = await res.json();
      if (res.ok) setTools(json.data || []);
      else showError(json.error || "Failed to load tools");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { fetchTools(); }, [fetchTools]);

  return { tools, loading, refetch: fetchTools };
}

export function useAgentAnalytics(agentId: string | null) {
  const [analytics, setAnalytics] = useState<AgentAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/analytics?agentId=${agentId}`);
      const json = await res.json();
      if (res.ok) setAnalytics(json.data);
      else showError(json.error || "Failed to load analytics");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  return { analytics, loading, refetch: fetchAnalytics };
}

export function useAgentHistory(agentId: string | null) {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  const fetchHistory = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (agentId) params.set("agentId", agentId);
      if (!reset && cursor) params.set("cursor", cursor);
      params.set("limit", "20");

      const res = await fetch(`/api/agents/history?${params}`);
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
  }, [agentId, cursor]);

  useEffect(() => { fetchHistory(true); }, [fetchHistory]);

  return { runs, loading, hasMore, loadMore: () => fetchHistory(false), refetch: () => fetchHistory(true) };
}

export function useAgentRunDetail(runId: string | null) {
  const [run, setRun] = useState<AgentRun | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRun = useCallback(async () => {
    if (!runId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/history/${runId}`);
      const json = await res.json();
      if (res.ok) setRun(json.data);
      else showError(json.error || "Failed to load run detail");
    } catch (err: any) {
      showError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => { fetchRun(); }, [fetchRun]);

  return { run, loading };
}
