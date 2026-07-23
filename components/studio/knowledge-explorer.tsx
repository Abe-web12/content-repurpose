"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, BookOpen, FileText, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  documentCount: number;
  chunkSize: number;
  chunkOverlap: number;
}

interface KnowledgeExplorerProps {
  knowledgeBases: KnowledgeBase[];
  loading: boolean;
  onSelect: (kb: KnowledgeBase) => void;
  onCreateNew: (data: { name: string; description: string }) => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

export function KnowledgeExplorer({ knowledgeBases, loading, onSelect, onCreateNew }: KnowledgeExplorerProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const filtered = knowledgeBases.filter(
    (kb) =>
      !search ||
      kb.name.toLowerCase().includes(search.toLowerCase()) ||
      (kb.description?.toLowerCase() ?? "").includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateNew({ name: newName.trim(), description: newDescription.trim() });
    setNewName("");
    setNewDescription("");
    setOpen(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search knowledge bases..."
            className="pl-9"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              New KB
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Knowledge Base</DialogTitle>
              <DialogDescription>
                Create a new knowledge base to store and chunk your documents.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="kb-name">Name</Label>
                <Input
                  id="kb-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="My Knowledge Base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kb-desc">Description</Label>
                <Input
                  id="kb-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
        className="grid gap-4 sm:grid-cols-2"
      >
        {filtered.map((kb) => (
          <motion.div key={kb.id} variants={fadeUp}>
            <Card
              className="cursor-pointer transition-all hover:shadow-md hover:border-surface-4 h-full"
              onClick={() => onSelect(kb)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                    <BookOpen className="h-5 w-5 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate">{kb.name}</CardTitle>
                    {kb.description && (
                      <CardDescription className="mt-0.5 line-clamp-2">
                        {kb.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-text-muted">
                    <FileText className="h-4 w-4" />
                    <span>{kb.documentCount} document{kb.documentCount !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-text-muted">
                    <Layers className="h-4 w-4" />
                    <span>CS {kb.chunkSize} | OV {kb.chunkOverlap}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <BookOpen className="h-10 w-10 text-text-muted mb-3" />
          <h3 className="text-base font-semibold text-text-primary">No knowledge bases</h3>
          <p className="mt-1.5 text-sm text-text-muted">
            Create your first knowledge base to get started.
          </p>
        </div>
      )}
    </div>
  );
}
