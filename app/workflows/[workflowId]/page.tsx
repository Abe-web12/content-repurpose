"use client";

import { use, useState } from "react";
import { useWorkflow, useWorkflowHistory, useRunWorkflow, useWorkflowLogs } from "@/hooks/use-workflows";
import { ExecutionTimeline } from "@/components/workflows/execution-timeline";
import { WorkflowLogs } from "@/components/workflows/workflow-logs";

export default function WorkflowDetailPage({ params }: { params: Promise<{ workflowId: string }> }) {
  const { workflowId } = use(params);
  const { workflow, loading } = useWorkflow(workflowId);
  const { runs } = useWorkflowHistory(workflowId);
  const { runWorkflow, running } = useRunWorkflow();
  const { logs } = useWorkflowLogs(workflowId);
  const [tab, setTab] = useState<"overview" | "history" | "logs">("overview");

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;
  if (!workflow) return <div className="p-6 text-red-500">Workflow not found</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{workflow.name}</h1>
          <p className="text-gray-500 text-sm">{workflow.description || "No description"}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => runWorkflow(workflow.id)}
            disabled={running}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"
          >
            {running ? "Running..." : "Run Now"}
          </button>
          <a
            href={`/workflows/builder?id=${workflow.id}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Edit
          </a>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b">
        {(["overview", "history", "logs"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg border p-4 bg-white">
            <div className="text-sm text-gray-500">Status</div>
            <div className="text-lg font-semibold">{workflow.status}</div>
          </div>
          <div className="rounded-lg border p-4 bg-white">
            <div className="text-sm text-gray-500">Version</div>
            <div className="text-lg font-semibold">{workflow.version}</div>
          </div>
          <div className="rounded-lg border p-4 bg-white">
            <div className="text-sm text-gray-500">Runs</div>
            <div className="text-lg font-semibold">{runs.length}</div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div>
          {runs.length === 0 ? (
            <p className="text-gray-400">No runs yet</p>
          ) : (
            <ExecutionTimeline runs={runs.slice(0, 10)} />
          )}
        </div>
      )}

      {tab === "logs" && <WorkflowLogs logs={logs} />}
    </div>
  );
}
