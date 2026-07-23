"use client";

import { useState, useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { usePrompts } from "@/hooks/use-prompts";
import { PromptList } from "@/components/studio/prompt-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export function PromptsPageClient() {
  const [search, setSearch] = useState("");
  const { prompts, loading } = usePrompts();

  const filtered = useMemo(() => {
    if (!search) return prompts;
    const q = search.toLowerCase();
    return prompts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
    );
  }, [prompts, search]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Prompt Templates"
        description="Create and manage your reusable prompt templates."
        action={
          <Button asChild>
            <Link href="/prompts/new">
              <Plus className="h-4 w-4" />
              New Prompt
            </Link>
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          placeholder="Search prompts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <PromptList prompts={filtered as any} loading={loading} onSelect={() => {}} />
    </div>
  );
}
