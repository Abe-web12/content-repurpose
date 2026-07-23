"use client";

export interface AgentRun {
  id: string;
  status: "COMPLETED" | "FAILED" | "RUNNING" | "PENDING";
  triggerType: "manual" | "scheduled" | "webhook" | "event";
  duration: number;
  error?: string;
  startedAt: string;
}

interface AgentRunTimelineProps {
  readonly runs: AgentRun[];
  readonly loading: boolean;
}

function StatusIcon({ status }: { readonly status: AgentRun["status"] }) {
  const color =
    status === "COMPLETED" ? "#16a34a"
    : status === "FAILED" ? "#dc2626"
    : status === "RUNNING" ? "#ca8a04"
    : "#6b7280";

  const label =
    status === "COMPLETED" ? "\u2713"
    : status === "FAILED" ? "\u2717"
    : status === "RUNNING" ? "\u25CF"
    : "\u25CB";

  return (
    <span
      style={{
        color,
        fontSize: "1rem",
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  );
}

export function AgentRunTimeline({ runs, loading }: AgentRunTimelineProps) {
  if (loading) {
    return <div className="rounded-lg border p-4 text-sm text-gray-500">Loading timeline...</div>;
  }

  return (
    <div className="rounded-lg border p-4 flex flex-col gap-3">
      <h3 className="font-semibold text-lg">Run Timeline</h3>
      {runs.length === 0 && (
        <p className="text-sm text-gray-500">No runs recorded.</p>
      )}
      <div className="flex flex-col gap-3">
        {runs.map((run, idx) => (
          <div key={run.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <StatusIcon status={run.status} />
              {idx < runs.length - 1 && (
                <div className="w-px flex-1 bg-gray-300" />
              )}
            </div>
            <div className="flex-1 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium capitalize">{run.triggerType}</span>
                <span className="text-xs text-gray-400">{run.duration}ms</span>
              </div>
              {run.error && (
                <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 mt-1">{run.error}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
