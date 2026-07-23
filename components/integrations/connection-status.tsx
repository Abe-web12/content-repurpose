"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

interface ConnectionStatusProps {
  status: string;
  health?: string | null;
  lastSyncAt?: string | null;
  lastError?: string | null;
}

const statusIcons: Record<string, React.ReactNode> = {
  CONNECTED: <CheckCircle className="h-4 w-4 text-green-400" />,
  DISCONNECTED: <XCircle className="h-4 w-4 text-gray-400" />,
  ERROR: <AlertTriangle className="h-4 w-4 text-red-400" />,
  EXPIRED: <Clock className="h-4 w-4 text-yellow-400" />,
  REVOKED: <XCircle className="h-4 w-4 text-orange-400" />,
  PENDING: <Clock className="h-4 w-4 text-blue-400" />,
};

export function ConnectionStatus({ status, health, lastSyncAt, lastError }: ConnectionStatusProps) {
  const isHealthy = health === "healthy";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {statusIcons[status] || statusIcons.DISCONNECTED}
        <span className="text-sm font-medium text-white">{status}</span>
        {health && (
          <Badge
            variant="outline"
            className={cn(
              "border px-2 py-0 text-xs font-normal",
              isHealthy
                ? "border-green-500/20 bg-green-500/10 text-green-400"
                : "border-red-500/20 bg-red-500/10 text-red-400"
            )}
          >
            {isHealthy ? "Healthy" : "Unhealthy"}
          </Badge>
        )}
      </div>
      {lastSyncAt && (
        <p className="text-xs text-gray-400">
          Last sync: {new Date(lastSyncAt).toLocaleString()}
        </p>
      )}
      {lastError && (
        <p className="text-xs text-red-400">Error: {lastError}</p>
      )}
    </div>
  );
}
