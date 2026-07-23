"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkflowTemplate } from "@/hooks/use-workflows";

interface TemplateCardProps {
  template: WorkflowTemplate;
}

export function TemplateCard({ template }: TemplateCardProps) {
  const router = useRouter();
  const [applying, setApplying] = useState(false);

  const applyTemplate = async () => {
    setApplying(true);
    try {
      const res = await fetch("/api/workflows/templates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.push(`/workflows/${json.data.id}`);
    } catch (err: any) {
      alert(err.message || "Failed to apply template");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="rounded-lg border p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{template.name}</h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
          {template.category}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{template.description}</p>
      <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
        <span>{template.isBuiltIn ? "Built-in" : "Custom"}</span>
        <span>{template.usageCount} uses</span>
      </div>
      <button
        onClick={applyTemplate}
        disabled={applying}
        className="w-full px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {applying ? "Applying..." : "Use Template"}
      </button>
    </div>
  );
}
