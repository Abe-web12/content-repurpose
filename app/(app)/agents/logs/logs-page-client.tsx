"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showError } from "@/components/ui/toast";
import { useAgents } from "@/hooks/use-agents";

interface ExecutionLog {
  id: string;
  agentId: string;
  runId: string;
  level: string;
  message: string;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

const PAGE_SIZE = 20;

export function LogsPageClient() {
  const { agents } = useAgents();
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchLogs = useCallback(async (reset = false) => {
    if (!selectedAgentId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ agentId: selectedAgentId, limit: String(PAGE_SIZE) });
      if (!reset && page > 1) params.set("page", String(page));
      if (statusFilter) params.set("level", statusFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const res = await fetch(`/api/agents/logs?${params}`);
      const json = await res.json();
      if (res.ok) {
        if (reset) setLogs(json.data || []);
        else setLogs((prev) => [...prev, ...(json.data || [])]);
        setHasMore((json.data || []).length === PAGE_SIZE);
      } else {
        showError(json.error || "Failed to load logs");
      }
    } catch (err: any) {
      showError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [selectedAgentId, page, statusFilter, dateFrom, dateTo]);

  const handleSearch = useCallback(() => {
    setPage(1);
    fetchLogs(true);
  }, [fetchLogs]);

  const loadMore = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  const levelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case "ERROR": return "text-red-600 bg-red-50";
      case "WARN": return "text-yellow-600 bg-yellow-50";
      case "INFO": return "text-blue-600 bg-blue-50";
      case "DEBUG": return "text-gray-600 bg-gray-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Agent Logs"
        description="View execution logs for your agents."
      />

      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Agent</label>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="border rounded px-3 py-2 text-sm min-w-[200px]"
          >
            <option value="">Select an agent...</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Level</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All Levels</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="DEBUG">DEBUG</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">From</label>
          <Input
            type="datetime-local"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">To</label>
          <Input
            type="datetime-local"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-sm"
          />
        </div>
        <Button onClick={handleSearch} disabled={!selectedAgentId}>
          {loading ? "Loading..." : "Search"}
        </Button>
      </div>

      <div className="rounded-lg border divide-y">
        {logs.length === 0 && !loading && (
          <div className="p-4 text-sm text-gray-500">No logs found. Select an agent and search.</div>
        )}
        {loading && logs.length === 0 && (
          <div className="p-4 text-sm text-gray-500">Loading logs...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="p-3 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColor(log.level)}`}>
                {log.level}
              </span>
              <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-700 font-mono">{log.message}</p>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
