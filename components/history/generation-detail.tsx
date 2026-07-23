"use client";

import { useState } from "react";
import { ArrowLeft, Heart, Trash2, Copy, Check, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, cn } from "@/lib/utils";
import type { Generation } from "@/lib/types/index";
import { deleteGeneration, toggleFavorite } from "@/hooks/use-generations";

interface GenerationDetailProps {
  generation: Generation | null;
  loading: boolean;
}

const formatLabels: Record<string, string> = {
  linkedin_post: "LinkedIn Post",
  linkedin_carousel: "LinkedIn Carousel",
  twitter_thread: "Twitter/X Thread",
};

export function GenerationDetail({ generation, loading }: GenerationDetailProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!generation) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-text-secondary">Generation not found.</p>
        <Button variant="link" asChild>
          <Link href="/history">Back to history</Link>
        </Button>
      </div>
    );
  }

  const gen = generation;

  async function handleToggleFavorite() {
    const result = await toggleFavorite(gen.id);
    if (result) {
      router.refresh();
    }
  }

  async function handleDelete() {
    const success = await deleteGeneration(gen.id);
    if (success) {
      router.push("/history");
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(gen.output_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/history">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-text-primary">
                {formatLabels[gen.output_format] || "Generation"}
              </h1>
              <Badge variant="secondary">{gen.input_type.replace(/_/g, " ")}</Badge>
            </div>
            <p className="mt-1 flex items-center gap-1 text-sm text-text-muted">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(gen.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleFavorite}
            className={cn(gen.is_favorite ? "text-red-500" : "text-text-muted")}
          >
            <Heart className={cn("h-5 w-5", gen.is_favorite && "fill-current")} />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleCopy}>
            {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete} className="text-red-500 hover:text-red-600">
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Separator />

      <Card>
        <CardContent className="p-6">
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-text-primary">
            {gen.output_content}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
