"use client";

import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  Brain,
  FileText,
  Search,
  Code,
  Wrench,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExecutionStep {
  id: string;
  nodeType: "llm" | "tool" | "memory" | "knowledge" | "code" | "api" | "router" | "output";
  status: "completed" | "failed" | "running" | "pending";
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  error?: string;
}

interface ExecutionTimelineProps {
  readonly steps: ExecutionStep[];
  readonly loading: boolean;
}

const nodeTypeConfig: Record<ExecutionStep["nodeType"], { icon: typeof Play; label: string }> = {
  llm: { icon: Brain, label: "LLM Call" },
  tool: { icon: Wrench, label: "Tool" },
  memory: { icon: Clock, label: "Memory" },
  knowledge: { icon: FileText, label: "Knowledge" },
  code: { icon: Code, label: "Code" },
  api: { icon: Globe, label: "API" },
  router: { icon: Search, label: "Router" },
  output: { icon: Play, label: "Output" },
};

const statusColor: Record<ExecutionStep["status"], string> = {
  completed: "#16a34a",
  failed: "#dc2626",
  running: "#ca8a04",
  pending: "#6b7280",
};

const statusBg: Record<ExecutionStep["status"], string> = {
  completed: "bg-green-100",
  failed: "bg-red-100",
  running: "bg-amber-100",
  pending: "bg-gray-100",
};

function formatDuration(ms?: number): string {
  if (ms === undefined || ms === null) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTimestamp(ts?: string): string {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return ts;
  }
}

function StepIcon({ nodeType, status }: { nodeType: ExecutionStep["nodeType"]; status: ExecutionStep["status"] }) {
  const Icon = nodeTypeConfig[nodeType]?.icon ?? Play;
  return (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full border-2",
        status === "completed" && "border-green-500 bg-green-50",
        status === "failed" && "border-red-500 bg-red-50",
        status === "running" && "border-amber-500 bg-amber-50",
        status === "pending" && "border-gray-300 bg-gray-50"
      )}
    >
      {status === "running" ? (
        <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" style={{ color: statusColor[status] }} />
      )}
    </div>
  );
}

function StatusDot({ status }: { readonly status: ExecutionStep["status"] }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: statusColor[status] }}
    />
  );
}

export const ExecutionTimeline = memo(function ExecutionTimeline({ steps, loading }: ExecutionTimelineProps) {
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  const toggleError = (id: string) => {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-surface-3 p-4 text-sm text-text-muted">
        Loading execution timeline...
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-surface-3 p-4">
      <h3 className="mb-4 font-semibold text-lg text-text-primary">Execution Timeline</h3>
      {steps.length === 0 && (
        <p className="text-sm text-text-muted">No steps recorded.</p>
      )}
      <div className="relative">
        {steps.map((step, idx) => {
          const config = nodeTypeConfig[step.nodeType] ?? { icon: Play, label: step.nodeType };
          const isLast = idx === steps.length - 1;
          const isExpanded = expandedErrors.has(step.id);

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.25 }}
              className="relative flex gap-3 pb-4"
            >
              <div className="flex flex-col items-center">
                <StepIcon nodeType={step.nodeType} status={step.status} />
                {!isLast && <div className="mt-1 w-px flex-1 bg-surface-3" />}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <StatusDot status={step.status} />
                  <span className="text-sm font-medium text-text-primary">
                    {config.label}
                  </span>
                  {step.duration !== undefined && step.duration !== null && (
                    <span className="ml-auto text-xs text-text-muted whitespace-nowrap">
                      {formatDuration(step.duration)}
                    </span>
                  )}
                </div>
                {(step.startedAt || step.completedAt) && (
                  <div className="mt-0.5 flex gap-3 text-xs text-text-muted">
                    {step.startedAt && <span>Start: {formatTimestamp(step.startedAt)}</span>}
                    {step.completedAt && <span>End: {formatTimestamp(step.completedAt)}</span>}
                  </div>
                )}
                {step.error && (
                  <div className="mt-1.5">
                    <button
                      type="button"
                      onClick={() => toggleError(step.id)}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      <XCircle className="h-3 w-3" />
                      Error details
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.pre
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-1 overflow-hidden rounded bg-red-50 px-3 py-2 text-xs text-red-700 font-mono whitespace-pre-wrap"
                        >
                          {step.error}
                        </motion.pre>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});
