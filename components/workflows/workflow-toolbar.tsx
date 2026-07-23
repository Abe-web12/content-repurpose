"use client";

import Link from "next/link";

interface WorkflowToolbarProps {
  name: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  saving: boolean;
  onAddNode: (type: string, label: string) => void;
}

export function WorkflowToolbar({ name, onNameChange, onSave, saving, onAddNode }: WorkflowToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
      <div className="flex items-center gap-4">
        <Link href="/workflows" className="text-gray-400 hover:text-gray-600">
          ←
        </Link>
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="font-semibold text-lg border-none outline-none bg-transparent"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Add:</span>
        <button onClick={() => onAddNode("AI_GENERATE", "Generate")} className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200">
          + AI
        </button>
        <button onClick={() => onAddNode("CONDITION", "Condition")} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">
          + Condition
        </button>
        <button onClick={() => onAddNode("DELAY", "Delay")} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">
          + Delay
        </button>
        <button onClick={() => onAddNode("WEBHOOK", "Webhook")} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">
          + Webhook
        </button>
        <button onClick={() => onAddNode("EMAIL", "Email")} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
          + Email
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
