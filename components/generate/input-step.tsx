"use client";

import { Globe, FileText, Youtube, Podcast, type LucideIcon } from "lucide-react";
import type { InputType } from "@/lib/constants/formats";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const tabs: { key: InputType; label: string; icon: LucideIcon }[] = [
  { key: "youtube_url", label: "YouTube", icon: Youtube },
  { key: "blog_url", label: "Blog URL", icon: Globe },
  { key: "podcast_url", label: "Podcast", icon: Podcast },
  { key: "raw_text", label: "Paste Text", icon: FileText },
];

const placeholders: Record<InputType, string> = {
  youtube_url: "https://youtube.com/watch?v=...",
  blog_url: "https://example.com/blog/article-title",
  podcast_url: "https://spotify.com/episode/... or audio URL",
  raw_text: "",
};

interface InputStepProps {
  inputType: InputType;
  inputValue: string;
  onTypeChange: (type: InputType) => void;
  onValueChange: (value: string) => void;
  error?: string | null;
}

export function InputStep({
  inputType,
  inputValue,
  onTypeChange,
  onValueChange,
  error,
}: InputStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg bg-surface-1 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTypeChange(tab.key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
              inputType === tab.key
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {inputType === "raw_text" ? (
        <Textarea
          value={inputValue}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="Paste your content here: article text, transcript, notes, ideas, anything you want to repurpose..."
          className="min-h-[200px]"
          error={error || undefined}
        />
      ) : (
        <Input
          value={inputValue}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholders[inputType]}
          error={error || undefined}
          type="url"
        />
      )}

      <p className="text-xs text-text-muted">
        {inputType === "raw_text"
          ? "Minimum 50 words. The more context you give, the better the output."
          : "Paste a public URL. We'll extract the content automatically."}
      </p>
    </div>
  );
}
