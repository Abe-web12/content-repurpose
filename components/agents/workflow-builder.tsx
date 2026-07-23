"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Calendar,
  Play,
  Pause,
  Clock,
  Code,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkflowSchedule {
  id: string;
  cron: string;
  task: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

interface WorkflowBuilderProps {
  readonly agentId: string;
  readonly onSchedule: (schedule: { cron: string; task: string; enabled: boolean }) => void;
  readonly initialData?: Partial<WorkflowSchedule>;
}

function cronToHumanReadable(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return "Invalid cron expression";

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const every = (v: string, desc: string) => (v === "*" ? `every ${desc}` : v);

  try {
    let desc = "Runs ";

    if (dayOfWeek !== "*") {
      const day = days[parseInt(dayOfWeek)] ?? dayOfWeek;
      desc += `on ${day}`;
    }
    if (dayOfMonth !== "*") {
      desc += ` on day ${dayOfMonth}`;
    }
    if (month !== "*") {
      const m = months[parseInt(month) - 1] ?? month;
      desc += ` in ${m}`;
    }
    if (hour !== "*" && minute !== "*") {
      desc += ` at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
    } else if (hour !== "*") {
      desc += ` at hour ${hour}`;
    } else if (minute !== "*") {
      desc += ` at minute ${minute}`;
    } else {
      desc += "every minute";
    }

    if (minute === "*" && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
      desc = "Runs every minute";
    }

    return desc;
  } catch {
    return "Invalid cron expression";
  }
}

function validateCron(cron: string): { valid: boolean; error?: string } {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { valid: false, error: "Cron must have exactly 5 fields" };
  }
  const ranges = [
    { name: "minute", min: 0, max: 59 },
    { name: "hour", min: 0, max: 23 },
    { name: "day of month", min: 1, max: 31 },
    { name: "month", min: 1, max: 12 },
    { name: "day of week", min: 0, max: 6 },
  ];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p === "*") continue;
    if (/^\d+$/.test(p)) {
      const n = parseInt(p, 10);
      const r = ranges[i];
      if (n < r.min || n > r.max) {
        return { valid: false, error: `${r.name} value ${n} out of range (${r.min}-${r.max})` };
      }
    } else if (/^\d+-\d+$/.test(p)) {
      const [a, b] = p.split("-").map(Number);
      const r = ranges[i];
      if (a < r.min || b > r.max || a > b) {
        return { valid: false, error: `Invalid ${r.name} range: ${p}` };
      }
    } else if (/^\*\/\d+$/.test(p)) {
      const step = parseInt(p.split("/")[1], 10);
      const r = ranges[i];
      if (step < 1 || step > r.max) {
        return { valid: false, error: `Invalid step value in ${r.name}: ${p}` };
      }
    } else if (/^\d+,\d+/.test(p)) {
      const vals = p.split(",").map(Number);
      const r = ranges[i];
      for (const v of vals) {
        if (v < r.min || v > r.max) {
          return { valid: false, error: `${r.name} value ${v} out of range` };
        }
      }
    } else {
      return { valid: false, error: `Invalid character in ${ranges[i].name} field: ${p}` };
    }
  }
  return { valid: true };
}

export function WorkflowBuilder({ agentId, onSchedule, initialData }: WorkflowBuilderProps) {
  const [cron, setCron] = useState(initialData?.cron ?? "");
  const [task, setTask] = useState(initialData?.task ?? "");
  const [enabled, setEnabled] = useState(initialData?.enabled ?? true);

  const cronValidation = useMemo(() => {
    if (!cron.trim()) return { valid: true };
    return validateCron(cron);
  }, [cron]);

  const humanReadable = useMemo(() => {
    if (!cron.trim() || !cronValidation.valid) return "";
    return cronToHumanReadable(cron);
  }, [cron, cronValidation.valid]);

  const handleSubmit = useCallback(() => {
    if (!cron.trim() || !cronValidation.valid) return;
    onSchedule({ cron: cron.trim(), task: task.trim(), enabled });
    setCron("");
    setTask("");
    setEnabled(true);
  }, [cron, task, enabled, cronValidation.valid, onSchedule]);

  const [schedules, setSchedules] = useState<WorkflowSchedule[]>([
    {
      id: "1",
      cron: "0 */6 * * *",
      task: JSON.stringify({ type: "summarize", source: "inbox" }, null, 2),
      enabled: true,
      lastRun: "2026-07-18T12:00:00Z",
      nextRun: "2026-07-19T06:00:00Z",
    },
    {
      id: "2",
      cron: "30 8 * * 1-5",
      task: JSON.stringify({ type: "report", format: "pdf" }, null, 2),
      enabled: false,
      lastRun: "2026-07-17T08:30:00Z",
      nextRun: "2026-07-20T08:30:00Z",
    },
  ]);

  const handleDelete = useCallback((id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleToggle = useCallback((id: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  }, []);

  return (
    <div className="rounded-lg border border-surface-3 p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-brand-500" />
        <h3 className="font-semibold text-lg text-text-primary">Workflow Builder</h3>
      </div>

      <div className="rounded-lg border border-surface-3 bg-surface-1 p-4 flex flex-col gap-3">
        <h4 className="text-sm font-medium text-text-primary">New Schedule</h4>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-secondary">Cron Expression</label>
          <div className="relative">
            <Timer className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              placeholder="*/5 * * * *"
              className={cn(
                "w-full rounded-lg border bg-white py-2 pl-8 pr-3 text-sm font-mono text-text-primary placeholder:text-text-muted transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500",
                !cronValidation.valid && "border-red-500 focus:ring-red-500/20 focus:border-red-500"
              )}
            />
          </div>
          {cronValidation.error && (
            <p className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3 w-3" />
              {cronValidation.error}
            </p>
          )}
          {humanReadable && cronValidation.valid && (
            <p className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              {humanReadable}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-secondary">Task Configuration (JSON)</label>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder='{"type": "process", "source": "inbox"}'
            rows={4}
            className={cn(
              "w-full rounded-lg border bg-white px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-muted transition-colors resize-none",
              "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            )}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs font-medium text-text-secondary">Enabled</span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled(!enabled)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                "focus:outline-none focus:ring-2 focus:ring-brand-500/20",
                enabled ? "bg-brand-500" : "bg-surface-3"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition duration-200",
                  enabled ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </label>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!cron.trim() || !cronValidation.valid || !task.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Schedule
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium text-text-primary">Existing Schedules</h4>
        {schedules.length === 0 && (
          <p className="text-sm text-text-muted py-2">No schedules configured.</p>
        )}
        <AnimatePresence initial={false}>
          {schedules.map((schedule) => (
            <motion.div
              key={schedule.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-lg border border-surface-3 bg-white p-3 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <code className="rounded bg-surface-2 px-2 py-0.5 text-xs font-mono text-text-primary">
                    {schedule.cron}
                  </code>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      schedule.enabled
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-text-muted"
                    )}
                  >
                    {schedule.enabled ? (
                      <Play className="h-3 w-3 mr-1" />
                    ) : (
                      <Pause className="h-3 w-3 mr-1" />
                    )}
                    {schedule.enabled ? "Active" : "Paused"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggle(schedule.id)}
                    className="rounded p-1.5 text-text-muted hover:bg-surface-2 transition-colors"
                    title={schedule.enabled ? "Disable" : "Enable"}
                  >
                    {schedule.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(schedule.id)}
                    className="rounded p-1.5 text-text-muted hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Delete schedule"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <pre className="rounded bg-surface-1 px-2 py-1.5 text-xs font-mono text-text-secondary overflow-x-auto">
                {schedule.task}
              </pre>

              <div className="flex items-center gap-4 text-xs text-text-muted">
                {schedule.lastRun && (
                  <span className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Last: {new Date(schedule.lastRun).toLocaleString()}
                  </span>
                )}
                {schedule.nextRun && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Next: {new Date(schedule.nextRun).toLocaleString()}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
