"use client";

import Link from "next/link";
import { Heart, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { formatRelativeTime, truncate } from "@/lib/utils";
import type { Generation } from "@/lib/types/index";
import { cn } from "@/lib/utils";

interface GenerationCardProps {
  generation: Generation;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

const formatLabels: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "outline" }> = {
  linkedin_post: { label: "LinkedIn Post", variant: "default" },
  linkedin_carousel: { label: "Carousel", variant: "success" },
  twitter_thread: { label: "Thread", variant: "warning" },
};

const inputLabels: Record<string, string> = {
  youtube_url: "YouTube",
  blog_url: "Blog",
  podcast_url: "Podcast",
  raw_text: "Text",
};

export function GenerationCard({ generation, onToggleFavorite, onDelete }: GenerationCardProps) {
  const formatInfo = formatLabels[generation.output_format] || { label: "Unknown", variant: "outline" as const };
  const inputLabel = inputLabels[generation.input_type] || "Unknown";

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant={formatInfo.variant}>{formatInfo.label}</Badge>
              <Badge variant="secondary">{inputLabel}</Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-text-primary line-clamp-3">
              {truncate(generation.output_content, 280)}
            </p>
            <div className="mt-3 flex items-center gap-3 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatRelativeTime(generation.created_at)}
              </span>
              {generation.voice_profile && (
                <span className="flex items-center gap-1">
                  {generation.voice_profile.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-surface-2 px-5 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onToggleFavorite(generation.id)}
            className={cn(
              "transition-colors",
              generation.is_favorite
                ? "text-red-500 hover:text-red-600"
                : "text-text-muted hover:text-red-500"
            )}
          >
            <Heart
              className={cn("h-4 w-4", generation.is_favorite && "fill-current")}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(generation.id)}
            className="text-text-muted hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" asChild>
          <Link href={`/history/${generation.id}`}>View details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
