"use client";

import type { WorkflowRun } from "@/hooks/use-workflows";

interface ExecutionTimelineProps {
  runs: WorkflowRun[];
}

export function ExecutionTimeline({ runs }: ExecutionTimelineProps) {
  if (runs.length === 0) {
    return <div className="text-gray-400 text-sm py-8 text-center">No executions yet</div>;
  }

  return (
    <div className="space-y-4">
      {runs.map((run) => {
        const statusColor: Record<string, string> = {
          COMPLETED: "bg-green-500",
          FAILED: "bg-red-500",
          RUNNING: "bg-blue-500",
          PENDING: "bg-yellow-500",
          CANCELLED: "bg-gray-400",
          TIMED_OUT: "bg-orange-500",
          RETRYING: "bg-purple-500",
        };

        return (
          <div key={run.id} className="relative pl-8 pb-4 border-l-2 border-gray-200 last:border-transparent">
            <div className={`absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full ${statusColor[run.status] || "bg-gray-300"}`} />
            <div className="bg-white rounded-lg border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{run.triggerType || "manual"} run</span>
                <span className={`text-xs font-medium ${
                  run.status === "COMPLETED" ? "text-green-600"
                  : run.status === "FAILED" ? "text-red-600"
                  : run.status === "RUNNING" ? "text-blue-600"
                  : "text-gray-500"
                }`}>
                  {run.status}
                </span>
              </div>
              <div className="text-xs text-gray-400 space-y-1">
                <p>Started: {run.startedAt ? new Date(run.startedAt).toLocaleString() : "N/A"}</p>
                {run.duration != null && <p>Duration: {(run.duration / 1000).toFixed(1)}s</p>}
                {run.error && <p className="text-red-500">Error: {run.error}</p>}
              </div>
              {run.steps && run.steps.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    {run.steps.length} steps
                  </summary>
                  <div className="mt-2 space-y-1">
                    {run.steps.map((step) => (
                      <div key={step.id} className="flex items-center gap-2 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          step.status === "COMPLETED" ? "bg-green-500"
                          : step.status === "FAILED" ? "bg-red-500"
                          : "bg-gray-300"
                        }`} />
                        <span className="text-gray-600">{step.nodeLabel || step.nodeType || "Unknown"}</span>
                        <span className="text-gray-400">
                          {step.status}
                          {step.duration && ` (${(step.duration / 1000).toFixed(1)}s)`}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
