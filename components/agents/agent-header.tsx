"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Pencil,
  Trash2,
  Cpu,
  Globe,
  Activity,
  Power,
  PowerOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AgentHeaderAgent {
  id: string;
  name: string;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED" | "ERROR";
  model: string;
  provider: string;
}

interface AgentHeaderProps {
  readonly agent: AgentHeaderAgent;
  readonly onRun?: () => void;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
  readonly onBack?: () => void;
}

const statusConfig: Record<AgentHeaderAgent["status"], { color: string; bg: string; icon: typeof Activity; label: string }> = {
  ACTIVE: { color: "#16a34a", bg: "bg-green-100", icon: Power, label: "Active" },
  DRAFT: { color: "#6b7280", bg: "bg-gray-100", icon: PowerOff, label: "Draft" },
  ARCHIVED: { color: "#ca8a04", bg: "bg-amber-100", icon: PowerOff, label: "Archived" },
  ERROR: { color: "#dc2626", bg: "bg-red-100", icon: PowerOff, label: "Error" },
};

export const AgentHeader = memo(function AgentHeader({
  agent,
  onRun,
  onEdit,
  onDelete,
  onBack,
}: AgentHeaderProps) {
  const status = statusConfig[agent.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-surface-3 bg-white p-4"
    >
      <div className="flex items-center gap-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-text-muted hover:bg-surface-2 hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100">
          <span className="text-xl font-bold text-brand-700">
            {agent.name.charAt(0).toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-text-primary truncate">{agent.name}</h1>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                status.bg
              )}
              style={{ color: status.color }}
            >
              <status.icon className="h-3 w-3" />
              {status.label}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-sm text-text-secondary">
            <span className="flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5 text-text-muted" />
              {agent.model}
            </span>
            <span className="flex items-center gap-1">
              <Globe className="h-3.5 w-3.5 text-text-muted" />
              {agent.provider}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onRun && (
            <button
              type="button"
              onClick={onRun}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
            >
              <Play className="h-4 w-4" />
              Run
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-lg border border-surface-3 px-3.5 py-2 text-sm font-medium text-text-primary hover:bg-surface-2 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-1.5 rounded-lg border border-surface-3 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
});
