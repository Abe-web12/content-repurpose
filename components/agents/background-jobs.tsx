"use client";

import { useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XCircle,
  RefreshCw,
  RotateCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Inbox,
  Play,
  Pause,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface BackgroundJob {
  id: string;
  name: string;
  status: "running" | "completed" | "failed" | "queued" | "cancelled";
  progress: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

interface BackgroundJobsProps {
  readonly jobs: BackgroundJob[];
  readonly loading: boolean;
  readonly onCancel?: (id: string) => void;
  readonly onRefresh?: () => void;
}

const statusConfig: Record<BackgroundJob["status"], { icon: typeof Clock; color: string; bg: string; label: string }> = {
  running: { icon: Loader2, color: "#ca8a04", bg: "bg-amber-100", label: "Running" },
  completed: { icon: CheckCircle2, color: "#16a34a", bg: "bg-green-100", label: "Completed" },
  failed: { icon: AlertCircle, color: "#dc2626", bg: "bg-red-100", label: "Failed" },
  queued: { icon: Clock, color: "#6b7280", bg: "bg-gray-100", label: "Queued" },
  cancelled: { icon: XCircle, color: "#6b7280", bg: "bg-gray-100", label: "Cancelled" },
};

function formatTime(ts?: string): string {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return ts;
  }
}

function getProgressColor(progress: number, status: BackgroundJob["status"]): string {
  if (status === "failed") return "#dc2626";
  if (status === "completed") return "#16a34a";
  if (status === "cancelled") return "#6b7280";
  if (progress < 30) return "#ca8a04";
  if (progress < 70) return "#2563eb";
  return "#16a34a";
}

interface JobCardProps {
  readonly job: BackgroundJob;
  readonly onCancel?: (id: string) => void;
}

const JobCard = memo(function JobCard({ job, onCancel }: JobCardProps) {
  const status = statusConfig[job.status];
  const StatusIcon = status.icon;
  const canCancel = (job.status === "running" || job.status === "queued") && onCancel;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
      className="rounded-lg border border-surface-3 bg-white p-3 flex flex-col gap-2.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-full", status.bg)}>
            {job.status === "running" ? (
              <StatusIcon className="h-4 w-4 animate-spin" style={{ color: status.color }} />
            ) : (
              <StatusIcon className="h-4 w-4" style={{ color: status.color }} />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-medium text-text-primary truncate">{job.name}</h4>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span>{status.label}</span>
              {job.startedAt && <span>Started {formatTime(job.startedAt)}</span>}
              {job.completedAt && <span>Completed {formatTime(job.completedAt)}</span>}
            </div>
          </div>
        </div>

        {canCancel && (
          <button
            type="button"
            onClick={() => onCancel(job.id)}
            className="rounded p-1.5 text-text-muted hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
            title="Cancel job"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${job.progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full rounded-full transition-colors"
            style={{
              backgroundColor: getProgressColor(job.progress, job.status),
            }}
          />
        </div>
        <span className="text-xs font-mono text-text-muted w-10 text-right shrink-0">
          {job.progress}%
        </span>
      </div>

      {job.error && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{job.error}</p>
      )}
    </motion.div>
  );
});

export const BackgroundJobs = memo(function BackgroundJobs({
  jobs,
  loading,
  onCancel,
  onRefresh,
}: BackgroundJobsProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);

  if (loading) {
    return (
      <div className="rounded-lg border border-surface-3 p-4 text-sm text-text-muted">
        Loading background jobs...
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-surface-3 flex flex-col">
      <div className="flex items-center gap-2 border-b border-surface-3 px-4 py-3">
        <RotateCw className="h-4 w-4 text-text-muted" />
        <h3 className="font-semibold text-sm text-text-primary flex-1">Background Jobs</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
              autoRefresh
                ? "bg-brand-100 text-brand-700"
                : "text-text-muted hover:bg-surface-2"
            )}
            title="Auto-refresh"
          >
            <RefreshCw className={cn("h-3 w-3", autoRefresh && "animate-spin-slow")} />
            Auto
          </button>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="rounded p-1.5 text-text-muted hover:bg-surface-2 transition-colors"
              title="Refresh now"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2">
        {jobs.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-8 text-text-muted"
          >
            <Inbox className="h-10 w-10" />
            <p className="text-sm">No background jobs.</p>
            <p className="text-xs">Jobs will appear here when agents run in the background.</p>
          </motion.div>
        )}

        <AnimatePresence>
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onCancel={onCancel} />
          ))}
        </AnimatePresence>

        {jobs.length > 0 && (
          <div className="flex items-center justify-between px-1 pt-1">
            <span className="text-xs text-text-muted">
              {jobs.filter((j) => j.status === "running").length} running,{" "}
              {jobs.filter((j) => j.status === "queued").length} queued
            </span>
            <span className="text-xs text-text-muted">{jobs.length} total</span>
          </div>
        )}
      </div>
    </div>
  );
});
