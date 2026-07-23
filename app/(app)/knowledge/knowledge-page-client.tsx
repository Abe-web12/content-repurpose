"use client";

import { useState, useCallback } from "react";
import { Search, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useKnowledgeBases } from "@/hooks/use-knowledge";
import { KnowledgeExplorer } from "@/components/studio/knowledge-explorer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export function KnowledgePageClient() {
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { knowledgeBases, loading } = useKnowledgeBases();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Bases"
        description="Manage your knowledge sources for RAG-powered generation."
        action={
          <Button className="gap-2" onClick={() => router.push("/knowledge/new")}>
            <Plus className="h-4 w-4" />
            New Knowledge Base
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          placeholder="Search knowledge bases..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <KnowledgeExplorer
        knowledgeBases={knowledgeBases as any}
        loading={loading}
        onSelect={(kb: any) => router.push(`/knowledge/${kb.id}`)}
        onCreateNew={() => router.push("/knowledge/new")}
      />
    </div>
  );
}
