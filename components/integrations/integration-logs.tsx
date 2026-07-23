"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2, AlertCircle, Info, AlertTriangle, Bug } from "lucide-react";

interface LogEntry {
  id: string;
  level: string;
  message: string;
  details: Record<string, unknown> | null;
  source: string;
  createdAt: string;
}

interface IntegrationLogsProps {
  installedId: string;
  limit?: number;
}

const levelConfig: Record<string, { icon: React.ReactNode; className: string }> = {
  debug: { icon: <Bug className="h-3.5 w-3.5" />, className: "text-gray-500" },
  info: { icon: <Info className="h-3.5 w-3.5" />, className: "text-blue-400" },
  warn: { icon: <AlertTriangle className="h-3.5 w-3.5" />, className: "text-yellow-400" },
  error: { icon: <AlertCircle className="h-3.5 w-3.5" />, className: "text-red-400" },
};

export function IntegrationLogs({ installedId, limit = 50 }: IntegrationLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const response = await fetch(`/api/integrations/logs?installedId=${installedId}&limit=${limit}`);
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Failed to fetch logs");
        setLogs(json.data?.logs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch logs");
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [installedId, limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-400">{error}</div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">No logs available</div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const config = levelConfig[log.level] || levelConfig.info;
        return (
          <Card key={log.id} className="border-white/5 bg-[#1E293B] p-3">
            <div className="flex items-start gap-3">
              <div className={cn("mt-0.5 shrink-0", config.className)}>
                {config.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("border px-1.5 py-0 text-[10px] font-normal uppercase", config.className.replace("text-", "border-").replace("text-", "text-"))}>
                    {log.level}
                  </Badge>
                  <span className="text-[10px] text-gray-500">{log.source}</span>
                  <span className="ml-auto text-[10px] text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-300">{log.message}</p>
                {log.details && Object.keys(log.details).length > 0 && (
                  <pre className="mt-1 overflow-x-auto text-[10px] text-gray-500">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
