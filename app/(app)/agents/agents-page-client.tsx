"use client";

import { useState, useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAgents } from "@/hooks/use-agents";
import { AgentCard } from "@/components/agents/agent-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export function AgentsPageClient() {
  const [search, setSearch] = useState("");
  const { agents, loading } = useAgents();

  const filtered = useMemo(() => {
    if (!search) return agents;
    const q = search.toLowerCase();
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description || "").toLowerCase().includes(q)
    );
  }, [agents, search]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="AI Agents"
        description="Create and manage your AI agents."
        action={
          <Button asChild>
            <Link href="/agents/new">
              <Plus className="h-4 w-4" />
              New Agent
            </Link>
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 animate-pulse space-y-3">
              <div className="h-5 bg-gray-200 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={{
                id: agent.id,
                name: agent.name,
                status: agent.status as "ACTIVE" | "DRAFT" | "ARCHIVED" | "ERROR",
                model: agent.model,
                provider: agent.provider,
                description: agent.description || "",
                lastUpdated: agent.updatedAt,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
