"use client";

export interface AgentTool {
  id: string;
  name: string;
  type: "function" | "api" | "code_interpreter" | "file_search" | "retrieval";
  description: string;
  enabled: boolean;
}

interface ToolManagerProps {
  readonly tools: AgentTool[];
  readonly onToggle: (id: string, enabled: boolean) => void;
}

function TypeBadge({ type }: { readonly type: AgentTool["type"] }) {
  const color =
    type === "function" ? "#2563eb"
    : type === "api" ? "#16a34a"
    : type === "code_interpreter" ? "#7c3aed"
    : type === "file_search" ? "#ca8a04"
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
      {type.replace("_", " ")}
    </span>
  );
}

export function ToolManager({ tools, onToggle }: ToolManagerProps) {
  return (
    <div className="rounded-lg border p-4 flex flex-col gap-3">
      <h3 className="font-semibold text-lg">Tools</h3>
      {tools.length === 0 && (
        <p className="text-sm text-gray-500">No tools configured.</p>
      )}
      <div className="flex flex-col gap-2">
        {tools.map((tool) => (
          <div key={tool.id} className="border rounded p-3 flex items-center justify-between">
            <div className="flex flex-col gap-1 flex-1">
              <div className="flex items-center gap-2">
                <TypeBadge type={tool.type} />
                <h4 className="font-medium text-sm">{tool.name}</h4>
              </div>
              <p className="text-sm text-gray-600">{tool.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-3">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={tool.enabled}
                onChange={() => onToggle(tool.id, !tool.enabled)}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
