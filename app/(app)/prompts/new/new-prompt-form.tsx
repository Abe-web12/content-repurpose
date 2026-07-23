"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showSuccess, showError } from "@/components/ui/toast";

const CATEGORIES = [
  { value: "summarization", label: "Summarization" },
  { value: "rewriting", label: "Rewriting" },
  { value: "extraction", label: "Extraction" },
  { value: "generation", label: "Generation" },
  { value: "analysis", label: "Analysis" },
];

export function NewPromptForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, category, content }),
      });
      if (!res.ok) throw new Error("Failed to create prompt");
      const data = await res.json();
      showSuccess("Prompt created successfully");
      router.push(`/prompts/${data.id}`);
    } catch (err: any) {
      showError(err.message || "Failed to create prompt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push("/prompts")} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to prompts
      </Button>

      <PageHeader
        title="New Prompt"
        description="Create a new reusable prompt template."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Blog Post Summarizer"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe what this prompt does..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Prompt Template</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your prompt template here. Use {{variable}} for dynamic values..."
            rows={12}
            className="font-mono text-sm"
            required
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving || !name.trim() || !content.trim()} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Prompt"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/prompts")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
