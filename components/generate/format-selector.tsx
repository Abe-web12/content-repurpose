"use client";

import { Layers, Linkedin, Twitter, type LucideIcon } from "lucide-react";
import type { OutputFormat } from "@/lib/constants/formats";
import { cn } from "@/lib/utils";

const formats: { key: OutputFormat; label: string; description: string; icon: LucideIcon; color: string }[] = [
  {
    key: "linkedin_post",
    label: "LinkedIn Post",
    description: "150-300 word post with hook",
    icon: Linkedin,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    key: "linkedin_carousel",
    label: "Carousel",
    description: "8-10 slide document",
    icon: Layers,
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  {
    key: "twitter_thread",
    label: "X Thread",
    description: "5-9 tweets under 280 chars",
    icon: Twitter,
    color: "text-sky-500 bg-sky-50 border-sky-200",
  },
];

interface FormatSelectorProps {
  selected: OutputFormat;
  onChange: (format: OutputFormat) => void;
}

export function FormatSelector({ selected, onChange }: FormatSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {formats.map((format) => {
        const active = selected === format.key;

        return (
          <button
            key={format.key}
            type="button"
            onClick={() => onChange(format.key)}
            className={cn(
              "relative flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-all",
              active
                ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500/20"
                : "border-surface-3 bg-white hover:border-surface-4 hover:shadow-sm"
            )}
          >
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg border", format.color)}>
              <format.icon className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold text-text-primary">{format.label}</p>
              <p className="mt-0.5 text-xs text-text-muted">{format.description}</p>
            </div>

            {active && (
              <div className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-brand-600" />
            )}
          </button>
        );
      })}
    </div>
  );
}
