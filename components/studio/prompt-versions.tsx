"use client";

import { motion } from "framer-motion";
import { RotateCcw, Plus, Clock, Circle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";

interface PromptVersion {
  id: string;
  version: number;
  status: "Draft" | "Published";
  content: string;
  createdAt: string | Date;
  createdBy: string;
}

interface PromptVersionsProps {
  versions: PromptVersion[];
  currentVersion: number;
  onSelect: (version: PromptVersion) => void;
  onCreateVersion: () => void;
}

export function PromptVersions({ versions, currentVersion, onSelect, onCreateVersion }: PromptVersionsProps) {
  const sorted = [...versions].sort((a, b) => b.version - a.version);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Version History</h3>
        <Button size="sm" onClick={onCreateVersion}>
          <Plus className="h-4 w-4 mr-1" />
          New Version
        </Button>
      </div>

      <Separator />

      <div className="relative space-y-0">
        {sorted.map((version, idx) => {
          const isCurrent = version.version === currentVersion;
          const isLast = idx === sorted.length - 1;

          return (
            <motion.div
              key={version.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.04 }}
              className={cn(
                "relative flex gap-4 pb-6 pl-8",
                isLast && "pb-0"
              )}
            >
              <div className="absolute left-0 top-1 flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border-2",
                    isCurrent
                      ? "border-brand-500 bg-brand-50"
                      : "border-surface-3 bg-white"
                  )}
                >
                  {isCurrent ? (
                    <CheckCircle2 className="h-3 w-3 text-brand-600" />
                  ) : (
                    <Circle className="h-3 w-3 text-text-muted" />
                  )}
                </div>
                {!isLast && (
                  <div className="mt-1 w-px flex-1 bg-surface-3" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isCurrent ? "text-brand-700" : "text-text-primary"
                    )}
                  >
                    v{version.version}
                  </span>
                  {isCurrent && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">
                      Current
                    </Badge>
                  )}
                  <Badge
                    variant={version.status === "Published" ? "success" : "warning"}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {version.status}
                  </Badge>
                </div>

                <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                  <Clock className="h-3 w-3" />
                  <span>{formatRelativeTime(version.createdAt)}</span>
                  <span>by {version.createdBy}</span>
                </div>

                <p className="mt-1.5 text-xs text-text-muted line-clamp-2 font-mono">
                  {version.content.slice(0, 150)}
                  {version.content.length > 150 ? "..." : ""}
                </p>

                {!isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={() => onSelect(version)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Rollback
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
