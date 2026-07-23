"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Copy,
  Check,
  ArrowDownFromLine,
  Info,
  AlertTriangle,
  XCircle,
  Bug,
  Terminal,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface LogEntry {
  id: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface LogsViewerProps {
  readonly logs: LogEntry[];
  readonly loading: boolean;
}

const levelConfig: Record<LogEntry["level"], { icon: typeof Info; color: string; bg: string; label: string }> = {
  info: { icon: Info, color: "#2563eb", bg: "bg-blue-50", label: "INFO" },
  warn: { icon: AlertTriangle, color: "#ca8a04", bg: "bg-amber-50", label: "WARN" },
  error: { icon: XCircle, color: "#dc2626", bg: "bg-red-50", label: "ERROR" },
  debug: { icon: Bug, color: "#6b7280", bg: "bg-gray-50", label: "DEBUG" },
};

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return ts;
  }
}

interface LogRowProps {
  readonly entry: LogEntry;
  readonly onCopy: (text: string) => void;
  readonly copiedId: string | null;
}

const LogRow = memo(function LogRow({ entry, onCopy, copiedId }: LogRowProps) {
  const config = levelConfig[entry.level];
  const Icon = config.icon;

  const copyText = JSON.stringify(
    {
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp,
      metadata: entry.metadata,
    },
    null,
    2
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group flex items-start gap-2 border-b border-surface-2 px-3 py-2 text-xs transition-colors hover:bg-surface-1",
        config.bg
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: config.color }} />
        <span
          className="shrink-0 font-mono font-semibold"
          style={{ color: config.color }}
        >
          {config.label}
        </span>
        <span className="shrink-0 text-text-muted font-mono">{formatTimestamp(entry.timestamp)}</span>
        <span className="text-text-primary font-mono whitespace-pre-wrap break-all">{entry.message}</span>
      </div>
      <button
        type="button"
        onClick={() => onCopy(copyText)}
        className="shrink-0 rounded p-1 text-text-muted opacity-0 group-hover:opacity-100 hover:bg-surface-2 transition-all"
        title="Copy log"
      >
        {copiedId === entry.id ? (
          <Check className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </motion.div>
  );
});

export const LogsViewer = memo(function LogsViewer({ logs, loading }: LogsViewerProps) {
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [levelFilter, setLevelFilter] = useState<LogEntry["level"] | "all">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter((log) => {
    if (levelFilter !== "all" && log.level !== levelFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.level.toLowerCase().includes(q) ||
        log.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  }, []);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  useEffect(() => {
    if (copiedId) {
      const timer = setTimeout(() => setCopiedId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-surface-3 p-4 text-sm text-text-muted">
        Loading logs...
      </div>
    );
  }

  const levelCounts = logs.reduce(
    (acc, log) => {
      acc[log.level] = (acc[log.level] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="rounded-lg border border-surface-3 flex flex-col">
      <div className="flex items-center gap-2 border-b border-surface-3 p-3">
        <Terminal className="h-4 w-4 text-text-muted" />
        <h3 className="font-semibold text-sm text-text-primary flex-1">
          Execution Logs
        </h3>
        <span className="text-xs text-text-muted">{logs.length} entries</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-surface-3 px-3 py-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="w-full rounded border border-surface-3 py-1.5 pl-7 pr-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-1">
          {(["all", "info", "warn", "error", "debug"] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setLevelFilter(level)}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium transition-colors",
                levelFilter === level
                  ? "bg-brand-100 text-brand-700"
                  : "text-text-muted hover:bg-surface-2"
              )}
            >
              {level === "all" ? (
                <Filter className="h-3 w-3 inline mr-0.5" />
              ) : null}
              {level.charAt(0).toUpperCase() + level.slice(1)}
              {level !== "all" && levelCounts[level] !== undefined && (
                <span className="ml-1 text-text-muted">({levelCounts[level]})</span>
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setAutoScroll(!autoScroll)}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
            autoScroll
              ? "bg-brand-100 text-brand-700"
              : "text-text-muted hover:bg-surface-2"
          )}
          title="Auto-scroll to bottom"
        >
          <ArrowDownFromLine className="h-3 w-3" />
          Auto
        </button>
      </div>

      <div
        ref={scrollRef}
        className="max-h-96 overflow-y-auto"
      >
        {filteredLogs.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-text-muted">
            <Search className="h-8 w-8" />
            <p className="text-sm">No logs match your filter.</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {filteredLogs.map((entry) => (
            <LogRow
              key={entry.id}
              entry={entry}
              onCopy={(text) => {
                handleCopy(text);
                setCopiedId(entry.id);
              }}
              copiedId={copiedId}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});
