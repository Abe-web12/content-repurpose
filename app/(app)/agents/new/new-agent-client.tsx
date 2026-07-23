"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgentBuilder, AgentFormData } from "@/components/agents/agent-builder";
import { PageHeader } from "@/components/shared/page-header";
import { showSuccess, showError } from "@/components/ui/toast";

export function NewAgentClient() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSave = async (data: AgentFormData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create agent");
      showSuccess("Agent created successfully");
      router.push(`/agents/${json.data.id}`);
    } catch (err: any) {
      showError(err.message || "Failed to create agent");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="New Agent"
        description="Configure your new AI agent."
      />
      <AgentBuilder onSave={handleSave} />
      {saving && <p className="text-sm text-gray-500">Saving agent...</p>}
    </div>
  );
}
