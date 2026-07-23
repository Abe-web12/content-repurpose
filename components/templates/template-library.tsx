"use client";

import { useState } from "react";
import {
  FileText, Twitter, Linkedin, BookOpen, Megaphone, ShoppingBag,
  Mail, CaseSensitive, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { useTemplates } from "@/hooks/use-templates";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { showSuccess } from "@/components/ui/toast";

const CATEGORIES = [
  { id: "all", label: "All", icon: FileText },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin },
  { id: "twitter", label: "Twitter/X", icon: Twitter },
  { id: "newsletter", label: "Newsletter", icon: Mail },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "blog", label: "Blog", icon: BookOpen },
];

interface TemplateLibraryProps {
  onSelectTemplate?: (content: string) => void;
}

export function TemplateLibrary({ onSelectTemplate }: TemplateLibraryProps) {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const { templates, loading, createTemplate, deleteTemplate, refetch } = useTemplates();

  const filtered = templates.filter((t) => {
    if (category !== "all" && t.category !== category && t.platform !== category) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
        !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleUseTemplate = (t: any) => {
    if (onSelectTemplate) {
      onSelectTemplate(t.content);
    }
    showSuccess(`"${t.name}" template applied`);
    setPreviewTemplate(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="w-full flex-wrap">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
              <cat.icon className="h-4 w-4" />
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-5 w-32 rounded bg-surface-3" /></CardHeader>
              <CardContent><div className="h-4 w-full rounded bg-surface-3" /></CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="No templates found"
          description={search ? "Try a different search" : "No templates in this category yet"}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id} className="group cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setPreviewTemplate(t)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-semibold text-text-primary">
                    {t.name}
                  </CardTitle>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 capitalize">
                    {t.platform}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-2 text-xs text-text-secondary">
                  {t.description || "No description"}
                </p>
                <p className="mt-2 line-clamp-2 text-xs text-text-muted">
                  {t.content.slice(0, 120)}...
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!previewTemplate} onOpenChange={(o) => { if (!o) setPreviewTemplate(null); }}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
            <DialogDescription>
              {previewTemplate?.description || "Content template"}
            </DialogDescription>
          </DialogHeader>
          <pre className="whitespace-pre-wrap rounded-lg bg-surface-1 p-4 text-sm text-text-primary">
            {previewTemplate?.content}
          </pre>
          <div className="flex gap-3">
            <Button onClick={() => handleUseTemplate(previewTemplate)} className="flex-1">
              Use This Template
            </Button>
            {previewTemplate?.is_custom && (
              <Button variant="outline" onClick={() => {
                deleteTemplate(previewTemplate.id);
                setPreviewTemplate(null);
              }}>
                Delete
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
