"use client";

import { Activity, UserPlus, Settings, Trash2, Crown, Shield, LogIn } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LogEntry {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: any;
  createdAt: string;
}

interface ActivityFeedProps {
  logs: LogEntry[];
  loading?: boolean;
}

const actionConfig: Record<string, { label: string; icon: any; color: string }> = {
  "org.create": { label: "Organization created", icon: Settings, color: "text-blue-600" },
  "org.update": { label: "Organization updated", icon: Settings, color: "text-blue-600" },
  "org.transfer_ownership": { label: "Ownership transferred", icon: Crown, color: "text-yellow-600" },
  "member.remove": { label: "Member removed", icon: Trash2, color: "text-red-600" },
  "member.suspend": { label: "Member suspended", icon: UserPlus, color: "text-orange-600" },
  "member.unsuspend": { label: "Member unsuspended", icon: UserPlus, color: "text-green-600" },
  "member.role_change": { label: "Role changed", icon: Shield, color: "text-purple-600" },
  "invite.create": { label: "Invitation sent", icon: UserPlus, color: "text-indigo-600" },
  "invite.accept": { label: "Invitation accepted", icon: LogIn, color: "text-green-600" },
};

function getActionConfig(action: string) {
  return actionConfig[action] || { label: action, icon: Activity, color: "text-gray-600" };
}

function FeedItem({ log }: { log: LogEntry }) {
  const config = getActionConfig(log.action);
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <div className="rounded-lg bg-muted p-2 mt-0.5">
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">
          {config.label}
          {log.details?.email && <span className="font-normal text-text-muted"> — {log.details.email}</span>}
          {log.details?.from && log.details?.to && (
            <span className="font-normal text-text-muted">: {log.details.from} → {log.details.to}</span>
          )}
        </p>
        <p className="text-xs text-text-muted">{new Date(log.createdAt).toLocaleString()}</p>
      </div>
    </div>
  );
}

export function ActivityFeed({ logs, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Activity</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Activity className="h-8 w-8 text-text-muted mb-2" />
            <p className="text-sm text-text-muted">No activity yet</p>
          </div>
        ) : (
          logs.map((log) => <FeedItem key={log.id} log={log} />)
        )}
      </CardContent>
    </Card>
  );
}
