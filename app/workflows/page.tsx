"use client";

import { useState } from "react";
import Link from "next/link";
import { useWorkflows, useWorkflowHistory } from "@/hooks/use-workflows";
import { WorkflowCard } from "@/components/workflows/workflow-card";
import { TemplateCard } from "@/components/workflows/template-card";
import { useWorkflowTemplates } from "@/hooks/use-workflows";

export default function WorkflowsPage() {
  const { workflows, loading: wfLoading, refetch } = useWorkflows();
  const { templates, loading: tmplLoading } = useWorkflowTemplates();
  const { runs } = useWorkflowHistory();
  const [tab, setTab] = useState<"workflows" | "templates" | "history">("workflows");

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-gray-500 text-sm">Automate your content repurposing pipeline</p>
        </div>
        <Link
          href="/workflows/builder"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          Create Workflow
        </Link>
      </div>

      <div className="flex gap-4 mb-6 border-b">
        {(["workflows", "templates", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "workflows" ? "My Workflows" : t === "templates" ? "Templates" : "Run History"}
          </button>
        ))}
      </div>

      {tab === "workflows" && (
        <>
          {wfLoading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No workflows yet</p>
              <Link
                href="/workflows/builder"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Create your first workflow
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((wf) => (
                <WorkflowCard key={wf.id} workflow={wf} onUpdate={refetch} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "templates" && (
        <>
          {tmplLoading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <TemplateCard key={t.id} template={t} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <div>
          {runs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No runs yet</div>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <div key={run.id} className="rounded-lg border p-4 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${run.status === "COMPLETED" ? "bg-green-500" : run.status === "FAILED" ? "bg-red-500" : run.status === "RUNNING" ? "bg-blue-500" : "bg-gray-300"}`} />
                      <span className="font-medium text-sm">{run.triggerType || "manual"}</span>
                      <span className="text-xs text-gray-400">{new Date(run.createdAt).toLocaleString()}</span>
                    </div>
                    <span className={`text-xs font-medium ${run.status === "COMPLETED" ? "text-green-600" : run.status === "FAILED" ? "text-red-600" : "text-gray-500"}`}>
                      {run.status}
                    </span>
                  </div>
                  {run.duration != null && <p className="text-xs text-gray-400 mt-1">Duration: {(run.duration / 1000).toFixed(1)}s</p>}
                  {run.error && <p className="text-xs text-red-500 mt-1">Error: {run.error}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
