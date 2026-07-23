"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { WorkflowCanvas } from "@/components/workflows/workflow-canvas";
import { NodeEditor } from "@/components/workflows/node-editor";
import { WorkflowToolbar } from "@/components/workflows/workflow-toolbar";
import { WorkflowSidebar } from "@/components/workflows/workflow-sidebar";

export default function WorkflowBuilderPage() {
  const router = useRouter();
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [saving, setSaving] = useState(false);

  const addNode = useCallback((type: string, label: string, config?: Record<string, unknown>) => {
    const newId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newNode = {
      id: newId,
      type,
      label,
      config: config ?? {},
      positionX: 100 + (nodes.length % 3) * 250,
      positionY: 200 + Math.floor(nodes.length / 3) * 150,
      width: 200,
      height: 100,
    };
    setNodes((prev) => [...prev, newNode]);
  }, [nodes.length]);

  const updateNode = useCallback((nodeId: string, updates: Partial<any>) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)));
    setSelectedNode((prev: any) => prev?.id === nodeId ? { ...prev, ...updates } : prev);
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId));
    setSelectedNode((prev: any) => prev?.id === nodeId ? null : prev);
  }, []);

  const saveWorkflow = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workflowName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const wfId = json.data.id;
      await fetch(`/api/workflows/${wfId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges }),
      });

      router.push("/workflows");
    } catch (err: any) {
      alert(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, workflowName, router]);

  return (
    <div className="h-screen flex flex-col">
      <WorkflowToolbar
        name={workflowName}
        onNameChange={setWorkflowName}
        onSave={saveWorkflow}
        saving={saving}
        onAddNode={addNode}
      />
      <div className="flex flex-1 overflow-hidden">
        <WorkflowSidebar onAddNode={addNode} />
        <div className="flex-1 relative">
          <WorkflowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={setNodes}
            onEdgesChange={setEdges}
            onSelectNode={setSelectedNode}
          />
        </div>
        {selectedNode && (
          <NodeEditor node={selectedNode} onUpdate={updateNode} onRemove={removeNode} />
        )}
      </div>
    </div>
  );
}
