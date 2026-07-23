"use client";

interface LogEntry {
  id: string;
  level: string;
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface WorkflowLogsProps {
  logs: LogEntry[];
}

export function WorkflowLogs({ logs }: WorkflowLogsProps) {
  const levelColors: Record<string, string> = {
    info: "text-blue-600",
    warn: "text-yellow-600",
    error: "text-red-600",
    debug: "text-gray-400",
  };

  if (logs.length === 0) {
    return <div className="text-gray-400 text-sm py-8 text-center">No logs available</div>;
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs max-h-96 overflow-y-auto">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-3 py-1 border-b border-gray-800 last:border-0">
          <span className="text-gray-500 shrink-0">
            {new Date(log.createdAt).toLocaleTimeString()}
          </span>
          <span className={`shrink-0 font-semibold ${levelColors[log.level] || "text-gray-400"}`}>
            {log.level.toUpperCase().padEnd(5)}
          </span>
          <span className="text-gray-200 break-all">{log.message}</span>
        </div>
      ))}
    </div>
  );
}
