"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectionStatus } from "@/components/integrations/connection-status";
import { SyncIndicator } from "@/components/integrations/sync-indicator";
import { HealthBadge } from "@/components/integrations/health-badge";
import { IntegrationLogs } from "@/components/integrations/integration-logs";
import { IntegrationGrid } from "@/components/integrations/integration-grid";
import { cn } from "@/lib/utils";
import {
  Puzzle, Plus, Settings, Trash2, ExternalLink, RefreshCw,
  Loader2, AlertCircle, CheckCircle, Clock
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface DashboardInstalled {
  id: string;
  integrationKey: string;
  status: string;
  config: Record<string, unknown>;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastError: string | null;
  lastHealthCheckAt: string | null;
  healthStatus: string | null;
  isPaused: boolean;
  createdAt: string;
  integration: {
    key: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    hasOAuth: boolean;
    hasWebhooks: boolean;
  } | null;
}

interface IntegrationsDashboardProps {
  installed: DashboardInstalled[];
  organizationId: string;
}

function formatRelativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const statusColors: Record<string, string> = {
  CONNECTED: "text-green-400 bg-green-500/10",
  DISCONNECTED: "text-gray-400 bg-gray-500/10",
  ERROR: "text-red-400 bg-red-500/10",
  EXPIRED: "text-yellow-400 bg-yellow-500/10",
  REVOKED: "text-orange-400 bg-orange-500/10",
  PENDING: "text-blue-400 bg-blue-500/10",
};

export function IntegrationsDashboard({ installed, organizationId }: IntegrationsDashboardProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(
    installed.length > 0 ? installed[0].id : null
  );
  const [uninstalling, setUninstalling] = useState<string | null>(null);

  const selected = installed.find((i) => i.id === selectedId);

  async function handleUninstall(installedId: string, integrationKey: string) {
    if (!confirm(`Uninstall ${integrationKey}? This will remove all associated data.`)) return;
    setUninstalling(installedId);

    try {
      const response = await fetch("/api/integrations/uninstall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationKey, organizationId }),
      });
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "Uninstall failed");
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Uninstall failed");
    } finally {
      setUninstalling(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Integrations</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage your connected tools and services
          </p>
        </div>
        <Link href="/marketplace">
          <Button className="bg-indigo-600 hover:bg-indigo-500">
            <Plus className="mr-2 h-4 w-4" />
            Add Integration
          </Button>
        </Link>
      </div>

      {installed.length === 0 ? (
        <Card className="border-white/5 bg-[#1E293B] p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10">
            <Puzzle className="h-8 w-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">No integrations installed</h3>
          <p className="mt-2 text-sm text-gray-400">
            Connect your favorite tools to automate your content workflow.
          </p>
          <Link href="/marketplace">
            <Button className="mt-6 bg-indigo-600 hover:bg-indigo-500">
              Browse Marketplace
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <Card className="border-white/5 bg-[#1E293B] p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">
              Installed ({installed.length})
            </h3>
            <div className="space-y-1">
              {installed.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    selectedId === item.id
                      ? "bg-indigo-500/10 text-indigo-300"
                      : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                  )}
                >
                  <Puzzle className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">
                    {item.integration?.name || item.integrationKey}
                  </span>
                  <span className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    item.status === "CONNECTED" ? "bg-green-400" :
                    item.status === "ERROR" ? "bg-red-400" :
                    item.status === "PENDING" ? "bg-blue-400" :
                    "bg-gray-500"
                  )} />
                </button>
              ))}
            </div>
          </Card>

          {selected && (
            <div className="space-y-6">
              <Card className="border-white/5 bg-[#1E293B] p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-500/10">
                      <Puzzle className="h-7 w-7 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {selected.integration?.name || selected.integrationKey}
                      </h2>
                      <p className="text-sm text-gray-400">
                        {selected.integration?.description}
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={cn("border px-2 py-0 text-xs font-normal", statusColors[selected.status] || statusColors.DISCONNECTED)}
                        >
                          {selected.status}
                        </Badge>
                        <HealthBadge
                          status={selected.healthStatus}
                          lastCheckAt={selected.lastHealthCheckAt}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <SyncIndicator
                      installedId={selected.id}
                      organizationId={organizationId}
                      lastSyncStatus={selected.lastSyncStatus}
                      lastSyncAt={selected.lastSyncAt}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUninstall(selected.id, selected.integrationKey)}
                      disabled={uninstalling === selected.id}
                      className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      {uninstalling === selected.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>

              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="border-white/5 bg-[#1E293B]">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="logs" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300">
                    Logs
                  </TabsTrigger>
                  {selected.integration?.hasWebhooks && (
                    <TabsTrigger value="webhooks" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300">
                      Webhooks
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card className="border-white/5 bg-[#1E293B] p-4">
                    <h3 className="mb-3 text-sm font-semibold text-white">Connection Details</h3>
                    <ConnectionStatus
                      status={selected.status}
                      health={selected.healthStatus}
                      lastSyncAt={selected.lastSyncAt}
                      lastError={selected.lastError}
                    />
                  </Card>
                  {selected.lastSyncAt && (
                    <Card className="border-white/5 bg-[#1E293B] p-4">
                      <h3 className="mb-3 text-sm font-semibold text-white">Sync History</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <RefreshCw className="h-4 w-4" />
                        {selected.lastSyncStatus === "success" && (
                          <span className="text-green-400">
                            Last synced {formatRelativeTime(selected.lastSyncAt)}
                          </span>
                        )}
                        {selected.lastSyncStatus === "failed" && (
                          <span className="text-red-400">
                            Sync failed {formatRelativeTime(selected.lastSyncAt)}
                          </span>
                        )}
                        {!selected.lastSyncStatus && (
                          <span>Synced {formatRelativeTime(selected.lastSyncAt)}</span>
                        )}
                      </div>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="logs">
                  <Card className="border-white/5 bg-[#1E293B] p-4">
                    <h3 className="mb-3 text-sm font-semibold text-white">Integration Logs</h3>
                    <IntegrationLogs installedId={selected.id} />
                  </Card>
                </TabsContent>

                {selected.integration?.hasWebhooks && (
                  <TabsContent value="webhooks">
                    <Card className="border-white/5 bg-[#1E293B] p-4">
                      <h3 className="mb-3 text-sm font-semibold text-white">Webhooks</h3>
                      <p className="text-sm text-gray-400">
                        Manage webhook endpoints for this integration.
                      </p>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
