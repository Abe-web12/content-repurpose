"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Save, Trash2, Copy, Heart, Play, ArrowLeft, Settings, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export default function PromptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const promptId = params.id as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [variables, setVariables] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = `${name || "Prompt"} - RepurposeAI`;
  }, [name]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/prompts/${promptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, content, variables }),
      });
      if (!res.ok) throw new Error("Failed to save");
      showSuccess("Prompt saved successfully");
    } catch (err: any) {
      showError(err.message || "Failed to save prompt");
    } finally {
      setSaving(false);
    }
  }, [promptId, name, description, content, variables]);

  const handleDelete = useCallback(async () => {
    try {
      const res = await fetch(`/api/prompts/${promptId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      showSuccess("Prompt deleted");
      router.push("/prompts");
    } catch (err: any) {
      showError(err.message || "Failed to delete prompt");
    }
  }, [promptId, router]);

  const handleClone = useCallback(async () => {
    try {
      const res = await fetch(`/api/prompts/${promptId}/clone`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to clone");
      const data = await res.json();
      showSuccess("Prompt cloned");
      router.push(`/prompts/${data.id}`);
    } catch (err: any) {
      showError(err.message || "Failed to clone prompt");
    }
  }, [promptId, router]);

  const toggleFavorite = useCallback(async () => {
    try {
      const res = await fetch(`/api/prompts/${promptId}/favorite`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle favorite");
      setIsFavorite((prev) => !prev);
      showSuccess(isFavorite ? "Removed from favorites" : "Added to favorites");
    } catch (err: any) {
      showError(err.message || "Failed to update favorite");
    }
  }, [promptId, isFavorite]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/prompts")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xl font-bold border-0 bg-transparent px-0 focus-visible:ring-0"
              placeholder="Prompt name"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleFavorite} className="gap-2">
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
            {isFavorite ? "Favorited" : "Favorite"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleClone} className="gap-2">
            <Copy className="h-4 w-4" />
            Clone
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} className="gap-2 text-red-600">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prompt Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this prompt does..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Prompt Template</label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter your prompt template with {{variable}} placeholders..."
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {variables.length === 0 ? (
                  <p className="text-sm text-text-muted">No variables defined. Use {"{{variableName}}"} in your prompt.</p>
                ) : (
                  variables.map((v) => (
                    <span key={v} className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                      {v}
                    </span>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Versions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-muted">Version history will appear here.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button className="w-full gap-2" asChild>
                <a href={`/playground?promptId=${promptId}`}>
                  <Play className="h-4 w-4" />
                  Run in Playground
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete prompt"
        description="Are you sure you want to delete this prompt? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
