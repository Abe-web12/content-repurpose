"use client";

import { RefreshCw, RotateCcw, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "./copy-button";

interface ActionBarProps {
  content: string;
  onRegenerate: () => void;
  onReset: () => void;
  regenerating?: boolean;
}

export function ActionBar({ content, onRegenerate, onReset, regenerating }: ActionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-surface-3 bg-surface-1 p-3">
      <CopyButton text={content} />

      <Button variant="outline" size="sm" onClick={onRegenerate} loading={regenerating}>
        <RefreshCw className="h-4 w-4" />
        Regenerate (1 credit)
      </Button>

      <Button variant="ghost" size="sm" onClick={onReset}>
        <RotateCcw className="h-4 w-4" />
        Start over
      </Button>

      <div className="ml-auto text-xs text-text-muted">
        {content.length} characters
      </div>
    </div>
  );
}
