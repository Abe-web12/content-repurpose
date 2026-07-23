"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showSuccess, showError } from "@/components/ui/toast";
import {
  useAgent,
  useMemory,
  useKnowledge,
  useTools,
  useAgentAnalytics,
  useAgentHistory,
  useAgentRunDetail,
  useAgentChat,
} from "@/hooks/use-agents";
import { AgentBuilder, AgentFormData } from "@/components/agents/agent-builder";
import { AgentChat } from "@/components/agents/agent-chat";
import { MemoryViewer } from "@/components/agents/memory-viewer";
import { KnowledgeManager } from "@/components/agents/knowledge-manager";
import { ToolManager } from "@/components/agents/tool-manager";
import { AnalyticsCards } from "@/components/agents/analytics-cards";
import { AgentRunTimeline } from "@/components/agents/agent-run-timeline";

export function AgentDetailClient() {
  const params = useParams();
  const router = useRouter();
  const agentId = (params?.id as string) || null;

  const { agent, loading: agentLoading, refetch: refetchAgent } = useAgent(agentId);
  const { memories, loading: memoriesLoading, pruneMemory } = useMemory(agentId);
  const { knowledgeBases, loading: knowledgeLoading } = useKnowledge(agentId);
  const { tools, loading: toolsLoading, refetch: refetchTools } = useTools(agentId);
  const { analytics, loading: analyticsLoading } = useAgentAnalytics(agentId);
  const { runs, loading: runsLoading, refetch: refetchRuns } = useAgentHistory(agentId);
  const { sendMessage, loading: chatLoading } = useAgentChat();
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: "user" | "assistant" | "system" | "tool"; content: string; timestamp: string }>>([]);
  const [cronExpression, setCronExpression] = useState("");
  const [schedules, setSchedules] = useState<Array<{ id: string; cron: string; enabled: boolean }>>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAgentUpdate = useCallback(async (data: AgentFormData) => {
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update agent");
      showSuccess("Agent updated successfully");
      refetchAgent();
    } catch (err: any) {
      showError(err.message || "Failed to update agent");
    }
  }, [agentId, refetchAgent]);

  const handleRun = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/run`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to run agent");
      showSuccess("Agent run started");
      refetchRuns();
    } catch (err: any) {
      showError(err.message || "Failed to run agent");
    }
  }, [agentId, refetchRuns]);

  const handleDelete = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete agent");
      }
      showSuccess("Agent deleted successfully");
      router.push("/agents");
    } catch (err: any) {
      showError(err.message || "Failed to delete agent");
    }
  }, [agentId, router]);

  const handlePruneMemory = useCallback(async () => {
    try {
      await pruneMemory();
      showSuccess("Memory pruned successfully");
    } catch {
      showError("Failed to prune memory");
    }
  }, [pruneMemory]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!agentId) return;
    const userMsg = { id: crypto.randomUUID(), role: "user" as const, content: message, timestamp: new Date().toISOString() };
    setChatMessages((prev) => [...prev, userMsg]);
    try {
      const data = await sendMessage(agentId, message);
      const assistantMsg = { id: data.id || crypto.randomUUID(), role: "assistant" as const, content: data.content || "", timestamp: new Date().toISOString() };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setChatMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    }
  }, [agentId, sendMessage]);

  const handleToolToggle = useCallback(async (toolId: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/agents/tools/${toolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Failed to toggle tool");
      refetchTools();
    } catch (err: any) {
      showError(err.message || "Failed to toggle tool");
    }
  }, [refetchTools]);

  const handleAddSchedule = useCallback(async () => {
    if (!cronExpression.trim()) return;
    try {
      const res = await fetch("/api/agents/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, cron: cronExpression }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add schedule");
      setSchedules((prev) => [...prev, json.data]);
      setCronExpression("");
      showSuccess("Schedule added");
    } catch (err: any) {
      showError(err.message || "Failed to add schedule");
    }
  }, [agentId, cronExpression]);

  const handleToggleSchedule = useCallback(async (scheduleId: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/agents/schedule/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Failed to toggle schedule");
      setSchedules((prev) => prev.map((s) => s.id === scheduleId ? { ...s, enabled } : s));
    } catch (err: any) {
      showError(err.message || "Failed to toggle schedule");
    }
  }, []);

  if (agentLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Agent Not Found" />
        <p className="text-sm text-gray-500">This agent could not be found.</p>
        <Button onClick={() => router.push("/agents")}>Back to Agents</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={agent.name}
        description={agent.description || undefined}
        action={
          <div className="flex gap-2">
            <Button onClick={handleRun}>Run Agent</Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </Button>
          </div>
        }
      />

      {showDeleteConfirm && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center justify-between">
          <p className="text-sm text-red-700">
            Are you sure you want to delete this agent? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Confirm Delete
            </Button>
          </div>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="flex gap-4 text-sm text-gray-600">
            <span>Status: <strong>{agent.status}</strong></span>
            <span>Model: <strong>{agent.model}</strong></span>
            <span>Provider: <strong>{agent.provider}</strong></span>
          </div>
          <AgentBuilder initialData={agent as AgentFormData} onSave={handleAgentUpdate} />
        </TabsContent>

        <TabsContent value="chat">
          <AgentChat
            messages={chatMessages}
            onSend={handleSendMessage}
            loading={chatLoading}
          />
        </TabsContent>

        <TabsContent value="memory">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={handlePruneMemory}>
                Prune Memory
              </Button>
            </div>
            <MemoryViewer
              memories={memories.map((m) => ({
                id: m.id,
                type: m.type as "short_term" | "long_term" | "episodic" | "semantic",
                content: m.content,
                score: m.score ?? 0,
                created: m.createdAt,
              }))}
              loading={memoriesLoading}
            />
          </div>
        </TabsContent>

        <TabsContent value="knowledge">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button>Add Knowledge Base</Button>
            </div>
            <KnowledgeManager
              knowledgeBases={knowledgeBases.map((kb) => ({
                id: kb.id,
                name: kb.name,
                description: kb.description || "",
                documentCount: kb.documentCount,
              }))}
              loading={knowledgeLoading}
            />
          </div>
        </TabsContent>

        <TabsContent value="tools">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button>Add Tool</Button>
            </div>
            <ToolManager
              tools={tools.map((t) => ({
                id: t.id,
                name: t.name,
                type: t.type as "function" | "api" | "code_interpreter" | "file_search" | "retrieval",
                description: t.description || "",
                enabled: t.enabled,
              }))}
              onToggle={handleToolToggle}
            />
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsCards
            analytics={{
              totalRuns: analytics?.totalRuns ?? 0,
              successRate: analytics?.successRate ?? 0,
              avgDuration: analytics?.avgDuration ?? 0,
              totalTokens: analytics?.totalTokens ?? 0,
              totalCost: analytics?.totalCost ?? 0,
            }}
            toolStats={[]}
            loading={analyticsLoading}
          />
        </TabsContent>

        <TabsContent value="runs">
          <AgentRunTimeline
            runs={runs.map((r) => ({
              id: r.id,
              status: r.status as "COMPLETED" | "FAILED" | "RUNNING" | "PENDING",
              triggerType: (r.triggerType as "manual" | "scheduled" | "webhook" | "event") || "manual",
              duration: r.duration ?? 0,
              error: r.error ?? undefined,
              startedAt: r.startedAt || r.createdAt,
            }))}
            loading={runsLoading}
          />
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Cron expression (e.g. 0 0 * * *)"
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={handleAddSchedule}>Add Schedule</Button>
          </div>
          <div className="rounded-lg border p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-lg">Schedules</h3>
            {schedules.length === 0 && (
              <p className="text-sm text-gray-500">No schedules configured.</p>
            )}
            {schedules.map((s) => (
              <div key={s.id} className="border rounded p-3 flex items-center justify-between">
                <span className="text-sm font-mono">{s.cron}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={s.enabled}
                    onChange={() => handleToggleSchedule(s.id, !s.enabled)}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
