"use client";

const NODE_CATEGORIES = [
  {
    name: "AI Actions",
    color: "bg-purple-500",
    nodes: [
      { type: "AI_GENERATE", label: "Generate" },
      { type: "AI_REWRITE", label: "Rewrite" },
      { type: "AI_SUMMARIZE", label: "Summarize" },
      { type: "AI_TRANSLATE", label: "Translate" },
      { type: "AI_EXPAND", label: "Expand" },
      { type: "AI_SHORTEN", label: "Shorten" },
      { type: "AI_OPTIMIZE", label: "SEO Optimize" },
      { type: "AI_TONE_CONVERT", label: "Tone Convert" },
    ],
  },
  {
    name: "Logic",
    color: "bg-green-500",
    nodes: [
      { type: "CONDITION", label: "Condition" },
      { type: "DELAY", label: "Delay" },
      { type: "LOOP", label: "Loop" },
      { type: "MERGE", label: "Merge" },
      { type: "SPLIT", label: "Split" },
    ],
  },
  {
    name: "Data",
    color: "bg-green-500",
    nodes: [
      { type: "VARIABLE", label: "Variable" },
      { type: "FORMATTER", label: "Formatter" },
      { type: "DATABASE", label: "Database" },
      { type: "HTTP_REQUEST", label: "HTTP Request" },
      { type: "WEBHOOK", label: "Webhook" },
    ],
  },
  {
    name: "Platform",
    color: "bg-blue-500",
    nodes: [
      { type: "EMAIL", label: "Email" },
      { type: "SOCIAL_PUBLISH", label: "Publish" },
    ],
  },
];

interface WorkflowSidebarProps {
  onAddNode: (type: string, label: string, config?: Record<string, unknown>) => void;
}

export function WorkflowSidebar({ onAddNode }: WorkflowSidebarProps) {
  return (
    <div className="w-56 border-r bg-gray-50 p-3 overflow-y-auto">
      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Nodes</h3>
      {NODE_CATEGORIES.map((cat) => (
        <div key={cat.name} className="mb-4">
          <h4 className="text-xs font-medium text-gray-400 mb-2">{cat.name}</h4>
          <div className="space-y-1">
            {cat.nodes.map((node) => (
              <button
                key={node.type}
                onClick={() => onAddNode(node.type, node.label)}
                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-white hover:shadow-sm transition-colors flex items-center gap-2"
              >
                <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                {node.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
