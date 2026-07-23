"use client";

import { Bell, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AnalyticsAlert } from "@/hooks/use-analytics";

interface AlertsCenterProps {
  alerts: AnalyticsAlert[];
}

const alertMeta = {
  info: {
    icon: Info,
    classes: "bg-blue-50 border-blue-200 text-blue-700",
    iconClass: "text-blue-500",
  },
  warning: {
    icon: AlertTriangle,
    classes: "bg-amber-50 border-amber-200 text-amber-700",
    iconClass: "text-amber-500",
  },
  error: {
    icon: AlertCircle,
    classes: "bg-red-50 border-red-200 text-red-700",
    iconClass: "text-red-500",
  },
};

export function AlertsCenter({ alerts }: AlertsCenterProps) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const visible = alerts.filter((_, i) => !dismissed.has(i));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Bell className="h-4 w-4 text-brand-600" />
        <CardTitle className="text-sm font-semibold">Alerts</CardTitle>
        {visible.length > 0 && (
          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
            {visible.length}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-surface-3 px-4 py-3">
            <span className="text-sm text-text-muted">
              No active alerts. Everything looks good!
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, i) => {
              if (dismissed.has(i)) return null;
              const meta = alertMeta[alert.type];
              const Icon = meta.icon;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border px-4 py-3",
                    meta.classes
                  )}
                >
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.iconClass)} aria-hidden="true" />
                  <p className="flex-1 text-sm leading-relaxed">{alert.message}</p>
                  <button
                    onClick={() => setDismissed((prev) => new Set([...prev, i]))}
                    className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                    aria-label="Dismiss alert"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}