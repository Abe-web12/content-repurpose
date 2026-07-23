"use client";

import { Linkedin, Twitter, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormatBreakdownProps {
  data: Record<string, number>;
}

const FORMAT_META: Record<string, { label: string; icon: typeof Linkedin; color: string; bg: string }> = {
  linkedin_post: { label: "LinkedIn Post", icon: Linkedin, color: "text-blue-600", bg: "bg-blue-50" },
  linkedin_carousel: { label: "Carousel", icon: Layers, color: "text-purple-600", bg: "bg-purple-50" },
  twitter_thread: { label: "X Thread", icon: Twitter, color: "text-sky-500", bg: "bg-sky-50" },
};

export function FormatBreakdown({ data }: FormatBreakdownProps) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const max = entries[0]?.[1] ?? 1;

  if (total === 0) {
    return (
      <p className="py-6 text-center text-sm text-text-muted">
        No data for this period.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(([fmt, count]) => {
        const meta = FORMAT_META[fmt] ?? {
          label: fmt,
          icon: Layers,
          color: "text-text-secondary",
          bg: "bg-surface-2",
        };
        const Icon = meta.icon;
        const pct = max > 0 ? Math.round((count / max) * 100) : 0;
        const sharePct = total > 0 ? Math.round((count / total) * 100) : 0;

        return (
          <div key={fmt} className="flex items-center gap-3">
            <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", meta.bg)}>
              <Icon className={cn("h-3.5 w-3.5", meta.color)} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-medium text-text-primary">{meta.label}</span>
                <span className="text-xs text-text-muted">
                  {count} <span className="text-text-muted/60">({sharePct}%)</span>
                </span>
              </div>
              <div
                className="h-1.5 w-full rounded-full bg-surface-2"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-brand-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}