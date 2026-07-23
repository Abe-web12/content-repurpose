"use client";

export interface AgentMemory {
  id: string;
  type: "short_term" | "long_term" | "episodic" | "semantic";
  content: string;
  score: number;
  created: string;
}

interface MemoryViewerProps {
  readonly memories: AgentMemory[];
  readonly loading: boolean;
}

function TypeBadge({ type }: { readonly type: AgentMemory["type"] }) {
  const color =
    type === "short_term" ? "#2563eb"
    : type === "long_term" ? "#16a34a"
    : type === "episodic" ? "#ca8a04"
    : "#7c3aed";

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
      {type.replace("_", " ")}
    </span>
  );
}

export function MemoryViewer({ memories, loading }: MemoryViewerProps) {
  if (loading) {
    return <div className="rounded-lg border p-4 text-sm text-gray-500">Loading memories...</div>;
  }

  return (
    <div className="rounded-lg border p-4 flex flex-col gap-3">
      <h3 className="font-semibold text-lg">Memories</h3>
      {memories.length === 0 && (
        <p className="text-sm text-gray-500">No memories found.</p>
      )}
      <div className="flex flex-col gap-2">
        {memories.map((mem) => (
          <div key={mem.id} className="border rounded p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <TypeBadge type={mem.type} />
              <span className="text-xs text-gray-400">{mem.created}</span>
            </div>
            <p className="text-sm text-gray-700">
              {mem.content.length > 200 ? mem.content.slice(0, 200) + "..." : mem.content}
            </p>
            <span className="text-xs text-gray-500">Score: {mem.score.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
