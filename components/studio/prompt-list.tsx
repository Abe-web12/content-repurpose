"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Heart, HeartOff, Clock, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PromptTemplate {
  id: string;
  name: string;
  description: string | null;
  status: "Draft" | "Published";
  tags: string[];
  version: number;
  categoryId: string | null;
  isFavorite: boolean;
  updatedAt: string | Date;
}

interface PromptListProps {
  prompts: PromptTemplate[];
  loading: boolean;
  onSelect: (prompt: PromptTemplate) => void;
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

export function PromptList({ prompts, loading, onSelect }: PromptListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filtered = prompts.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description?.toLowerCase() ?? "").includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || p.categoryId === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="social">Social Media</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="blog">Blog</SelectItem>
          </SelectContent>
        </Select>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="Draft">Draft</TabsTrigger>
            <TabsTrigger value="Published">Published</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {filtered.map((prompt) => (
          <motion.div key={prompt.id} variants={fadeUp}>
            <Card
              className="cursor-pointer transition-all hover:shadow-md hover:border-surface-4"
              onClick={() => onSelect(prompt)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate">{prompt.name}</CardTitle>
                    {prompt.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {prompt.description}
                      </CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {prompt.isFavorite ? (
                      <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                    ) : (
                      <HeartOff className="h-4 w-4 text-text-muted" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={prompt.status === "Published" ? "success" : "warning"}
                  >
                    {prompt.status}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    v{prompt.version}
                  </Badge>
                  {prompt.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                  {prompt.tags.length > 3 && (
                    <span className="text-xs text-text-muted">
                      +{prompt.tags.length - 3}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <h3 className="text-base font-semibold text-text-primary">No prompts found</h3>
          <p className="mt-1.5 text-sm text-text-muted">
            Try adjusting your search or filters.
          </p>
        </div>
      )}
    </div>
  );
}
