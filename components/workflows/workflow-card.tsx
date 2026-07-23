"use client";

import type { Workflow } from "@/hooks/use-workflows";

interface WorkflowCardProps {
  workflow: Workflow;
  onUpdate?: () => void;
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const statusColor: Record<string, string> = {
    DRAFT: "bg-yellow-100 text-yellow-800",
    PUBLISHED: "bg-green-100 text-green-800",
    ARCHIVED: "bg-gray-100 text-gray-600",
    DISABLED: "bg-red-100 text-red-800",
  };

  return (
    <a href={`/workflows/${workflow.id}`} className="block rounded-lg border p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold truncate">{workflow.name}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[workflow.status] || "bg-gray-100"}`}>
          {workflow.status}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
        {workflow.description || "No description"}
      </p>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>v{workflow.version}</span>
        <span>{new Date(workflow.updatedAt).toLocaleDateString()}</span>
      </div>
      {workflow.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {workflow.tags.map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}
