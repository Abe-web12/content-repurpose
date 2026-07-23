"use client";

export interface Agent {
  id: string;
  name: string;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED" | "ERROR";
  model: string;
  provider: string;
  description: string;
  lastUpdated: string;
}

interface AgentCardProps {
  readonly agent: Agent;
  readonly onEdit?: (id: string) => void;
  readonly onRun?: (id: string) => void;
  readonly onDelete?: (id: string) => void;
}

function StatusBadge({ status }: { readonly status: Agent["status"] }) {
  const color =
    status === "ACTIVE" ? "#16a34a"
    : status === "ERROR" ? "#dc2626"
    : status === "DRAFT" ? "#6b7280"
    : "#ca8a04";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        fontSize: "0.75rem",
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

export function AgentCard({ agent, onEdit, onRun, onDelete }: AgentCardProps) {
  const truncated =
    agent.description.length > 100
      ? agent.description.slice(0, 100) + "..."
      : agent.description;

  return (
    <div className="rounded-lg border p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{agent.name}</h3>
        <StatusBadge status={agent.status} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
        <span>Model: {agent.model}</span>
        <span>Provider: {agent.provider}</span>
      </div>
      <p className="text-sm text-gray-500">{truncated}</p>
      <span className="text-xs text-gray-400">Last updated: {agent.lastUpdated}</span>
      <div className="flex gap-2">
        {onEdit && (
          <button
            onClick={() => onEdit(agent.id)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Edit
          </button>
        )}
        {onRun && (
          <button
            onClick={() => onRun(agent.id)}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Run
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(agent.id)}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
