"use client";

export interface AgentTask {
  id: string;
  title: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  priority: "low" | "medium" | "high" | "critical";
  toolType: string;
  error?: string;
}

interface TaskQueueProps {
  readonly tasks: AgentTask[];
  readonly loading: boolean;
}

function StatusBadge({ status }: { readonly status: AgentTask["status"] }) {
  const color =
    status === "COMPLETED" ? "#16a34a"
    : status === "FAILED" ? "#dc2626"
    : status === "RUNNING" ? "#ca8a04"
    : "#6b7280";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 6px",
        fontSize: "0.7rem",
        fontWeight: 600,
        borderRadius: "9999px",
        color: "#fff",
        backgroundColor: color,
      }}
    >
      {status}
    </span>
  );
}

function PriorityIndicator({ priority }: { readonly priority: AgentTask["priority"] }) {
  const color =
    priority === "critical" ? "#dc2626"
    : priority === "high" ? "#ea580c"
    : priority === "medium" ? "#ca8a04"
    : "#6b7280";

  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        backgroundColor: color,
      }}
    />
  );
}

export function TaskQueue({ tasks, loading }: TaskQueueProps) {
  if (loading) {
    return <div className="rounded-lg border p-4 text-sm text-gray-500">Loading tasks...</div>;
  }

  return (
    <div className="rounded-lg border p-4 flex flex-col gap-3">
      <h3 className="font-semibold text-lg">Task Queue</h3>
      {tasks.length === 0 && (
        <p className="text-sm text-gray-500">No tasks in queue.</p>
      )}
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <div key={task.id} className="border rounded p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PriorityIndicator priority={task.priority} />
                <h4 className="font-medium text-sm">{task.title}</h4>
              </div>
              <StatusBadge status={task.status} />
            </div>
            <span className="text-xs text-gray-500">Tool: {task.toolType}</span>
            {task.error && (
              <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{task.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
