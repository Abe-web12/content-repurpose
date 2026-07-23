"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface SyncIndicatorProps {
  installedId: string;
  organizationId: string;
  lastSyncStatus?: string | null;
  lastSyncAt?: string | null;
  compact?: boolean;
}

export function SyncIndicator({ installedId, organizationId, lastSyncStatus, lastSyncAt, compact }: SyncIndicatorProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const router = useRouter();

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installedId, organizationId }),
      });

      const json = await response.json();
      if (response.ok) {
        setSyncResult({ success: true, message: "Sync completed" });
      } else {
        setSyncResult({ success: false, message: json.error || "Sync failed" });
      }
      router.refresh();
    } catch {
      setSyncResult({ success: false, message: "Sync failed" });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 5000);
    }
  }

  if (compact) {
    return (
      <button
        onClick={handleSync}
        disabled={syncing}
        className={cn(
          "flex items-center gap-1 text-xs transition-colors",
          syncing ? "text-indigo-400" : "text-gray-400 hover:text-white"
        )}
      >
        {syncing ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : syncResult?.success ? (
          <CheckCircle className="h-3 w-3 text-green-400" />
        ) : syncResult ? (
          <AlertCircle className="h-3 w-3 text-red-400" />
        ) : (
          <RefreshCw className="h-3 w-3" />
        )}
        {syncing ? "Syncing..." : syncResult ? syncResult.message : "Sync"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={syncing}
        className="border-white/10 text-gray-300 hover:text-white"
      >
        {syncing ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
        )}
        {syncing ? "Syncing..." : "Sync Now"}
      </Button>
      {syncResult && (
        <span className={cn("text-xs", syncResult.success ? "text-green-400" : "text-red-400")}>
          {syncResult.message}
        </span>
      )}
      {lastSyncAt && !syncResult && (
        <span className="text-xs text-gray-500">
          Updated {new Date(lastSyncAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}
