"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { AlertTriangle, Info, CheckCircle, XCircle, Bell } from "lucide-react";

interface AlertCardEvent {
  id: string;
  metric: string;
  value: number;
  condition: string;
  threshold: number;
  message: string;
  status: string;
  createdAt: string;
  alert?: { name: string; metric: string } | null;
}

interface AlertCardProps {
  event: AlertCardEvent;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}

const statusConfig = {
  triggered: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
  acknowledged: { icon: Info, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20" },
  resolved: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/20" },
} as const;

export function AlertCard({ event, onAcknowledge, onResolve }: AlertCardProps) {
  const config = statusConfig[event.status as keyof typeof statusConfig] || statusConfig.triggered;
  const Icon = config.icon;

  return (
    <Card className={cn("border-l-4", event.status === "triggered" && "border-l-red-500", event.status === "acknowledged" && "border-l-amber-500", event.status === "resolved" && "border-l-green-500")}>
      <CardContent className="flex items-start gap-3 p-4">
        <div className={cn("rounded-full p-1.5", config.bg)}>
          <Icon className={cn("h-4 w-4", config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-text-primary truncate">
              {event.alert?.name || event.metric}
            </p>
            <Badge variant="outline" className="text-[10px] capitalize">{event.status}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-text-secondary">{event.message}</p>
          <div className="mt-1 flex items-center gap-3 text-[10px] text-text-muted">
            <span>{formatRelativeTime(event.createdAt)}</span>
            <span>Value: {event.value}</span>
            <span>Threshold: {event.threshold}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {event.status === "triggered" && onAcknowledge && (
            <Button variant="ghost" size="icon-sm" onClick={() => onAcknowledge(event.id)} title="Acknowledge">
              <Bell className="h-3.5 w-3.5" />
            </Button>
          )}
          {event.status !== "resolved" && onResolve && (
            <Button variant="ghost" size="icon-sm" onClick={() => onResolve(event.id)} title="Resolve">
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
