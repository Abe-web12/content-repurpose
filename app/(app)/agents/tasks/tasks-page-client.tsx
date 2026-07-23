"use client";

import { useState, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showSuccess, showError } from "@/components/ui/toast";
import { useAgents, useTasks } from "@/hooks/use-agents";
import { TaskQueue } from "@/components/agents/task-queue";

const STATUS_TABS = ["all", "pending", "running", "completed", "failed"] as const;

export function TasksPageClient() {
  const { agents } = useAgents();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const { tasks, loading, refetch } = useTasks(selectedAgentId);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_TABS)[number]>("all");

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assigneeAgentId, setAssigneeAgentId] = useState("");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return tasks;
    return tasks.filter((t) => t.status.toLowerCase() === statusFilter);
  }, [tasks, statusFilter]);

  const handleCreateTask = useCallback(async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/agents/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: assigneeAgentId || selectedAgentId,
          title,
          description: description || undefined,
          priority,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create task");
      showSuccess("Task created");
      setTitle("");
      setDescription("");
      setPriority("medium");
      setAssigneeAgentId("");
      setShowForm(false);
      refetch();
    } catch (err: any) {
      showError(err.message || "Failed to create task");
    } finally {
      setCreating(false);
    }
  }, [title, description, priority, assigneeAgentId, selectedAgentId, refetch]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Agent Tasks"
        description="Manage agent task queue."
        action={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "New Task"}
          </Button>
        }
      />

      {showForm && (
        <div className="rounded-lg border p-4 space-y-4">
          <Input
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-4">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <select
              value={assigneeAgentId || selectedAgentId || ""}
              onChange={(e) => setAssigneeAgentId(e.target.value)}
              className="border rounded px-3 py-2 text-sm flex-1"
            >
              <option value="">Select agent...</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <Button onClick={handleCreateTask} disabled={creating || !title.trim()}>
            {creating ? "Creating..." : "Create Task"}
          </Button>
        </div>
      )}

      <div className="flex gap-4">
        <select
          value={selectedAgentId || ""}
          onChange={(e) => setSelectedAgentId(e.target.value || null)}
          className="border rounded px-3 py-2 text-sm max-w-xs"
        >
          <option value="">All Agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 border-b pb-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              statusFilter === tab
                ? "bg-blue-100 text-blue-700 font-medium"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <TaskQueue
        tasks={filtered.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status as "PENDING" | "RUNNING" | "COMPLETED" | "FAILED",
          priority: t.priority as "low" | "medium" | "high" | "critical",
          toolType: t.toolType || "general",
          error: t.error ?? undefined,
        }))}
        loading={loading}
      />
    </div>
  );
}
