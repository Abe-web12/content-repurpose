"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showSuccess, showError } from "@/components/ui/toast";
import { useAgents } from "@/hooks/use-agents";

interface BackgroundJob {
  id: string;
  agentId: string;
  status: string;
  progress: number;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

interface ScheduledRun {
  id: string;
  agentId: string;
  cron: string;
  status: string;
  progress: number;
  nextRun: string;
  lastRun: string | null;
}

export function WorkflowsPageClient() {
  const { agents } = useAgents();
  const [backgroundJobs, setBackgroundJobs] = useState<BackgroundJob[]>([]);
  const [scheduledRuns, setScheduledRuns] = useState<ScheduledRun[]>([]);
  const [cronInput, setCronInput] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");

  const fetchBackgroundJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/background");
      const json = await res.json();
      if (res.ok) setBackgroundJobs(json.data || []);
      else showError(json.error || "Failed to load background jobs");
    } catch (err: any) {
      showError(err.message || "Network error");
    }
  }, []);

  const cancelBackgroundJob = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/agents/background/${jobId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to cancel job");
      setBackgroundJobs((prev) => prev.filter((j) => j.id !== jobId));
      showSuccess("Job cancelled");
    } catch (err: any) {
      showError(err.message || "Failed to cancel job");
    }
  }, []);

  const addScheduledRun = useCallback(async () => {
    if (!cronInput.trim() || !selectedAgentId) return;
    try {
      const res = await fetch("/api/agents/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selectedAgentId, cron: cronInput }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create schedule");
      setScheduledRuns((prev) => [
        ...prev,
        { id: json.data.id, agentId: selectedAgentId, cron: cronInput, status: "active", progress: 0, nextRun: "", lastRun: null },
      ]);
      setCronInput("");
      showSuccess("Scheduled run created");
    } catch (err: any) {
      showError(err.message || "Failed to create schedule");
    }
  }, [cronInput, selectedAgentId]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Agent Workflows"
        description="Manage workflow integration, background jobs, and scheduled agent runs."
        action={
          <Button onClick={fetchBackgroundJobs}>Refresh Jobs</Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="font-semibold text-lg">Background Jobs</h3>
          {backgroundJobs.length === 0 && (
            <p className="text-sm text-gray-500">No background jobs running.</p>
          )}
          <div className="flex flex-col gap-2">
            {backgroundJobs.map((job) => (
              <div key={job.id} className="border rounded p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Agent: {job.agentId}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{job.status}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Progress: {job.progress}%</span>
                  <Button variant="destructive" size="sm" onClick={() => cancelBackgroundJob(job.id)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="font-semibold text-lg">Schedule Agent Runs</h3>
          <div className="flex flex-col gap-3">
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="">Select an agent...</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Input
                placeholder="Cron (e.g. 0 */6 * * *)"
                value={cronInput}
                onChange={(e) => setCronInput(e.target.value)}
              />
              <Button onClick={addScheduledRun} disabled={!cronInput.trim() || !selectedAgentId}>
                Add
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {scheduledRuns.length === 0 && (
              <p className="text-sm text-gray-500">No scheduled runs configured.</p>
            )}
            {scheduledRuns.map((sr) => (
              <div key={sr.id} className="border rounded p-3 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-mono">{sr.cron}</span>
                  <span className="text-xs text-gray-500">Status: {sr.status}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  {sr.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
