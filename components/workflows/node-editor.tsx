"use client";

import { useState } from "react";

interface NodeEditorProps {
  node: {
    id: string;
    type: string;
    label: string;
    config: Record<string, unknown>;
  };
  onUpdate: (nodeId: string, updates: Partial<any>) => void;
  onRemove: (nodeId: string) => void;
}

export function NodeEditor({ node, onUpdate, onRemove }: NodeEditorProps) {
  const [label, setLabel] = useState(node.label);
  const [config, setConfig] = useState(JSON.stringify(node.config, null, 2));

  const applyChanges = () => {
    onUpdate(node.id, { label, config: JSON.parse(config) });
  };

  return (
    <div className="w-80 border-l bg-white p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Node Editor</h3>
        <button onClick={() => onRemove(node.id)} className="text-red-500 text-xs hover:text-red-700">
          Remove
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
          <input value={node.type} disabled className="w-full px-2 py-1.5 border rounded text-sm bg-gray-50" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-2 py-1.5 border rounded text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Configuration (JSON)</label>
          <textarea
            value={config}
            onChange={(e) => setConfig(e.target.value)}
            rows={10}
            className="w-full px-2 py-1.5 border rounded text-xs font-mono"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={applyChanges} className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
