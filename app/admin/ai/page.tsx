"use client";

import { useAIProviders, useAIHealth, useAIUsage, useAIAnalytics } from "@/hooks/use-ai";
import { ProviderCard } from "@/components/ai/provider-card";
import { StatsCard } from "@/components/ai/stats-card";
import { UsageChart } from "@/components/ai/usage-chart";
import { useState } from "react";

export default function AdminAIPage() {
  const { providers, loading: providersLoading } = useAIProviders();
  const { healthData, loading: healthLoading } = useAIHealth();
  const { usage, loading: usageLoading } = useAIUsage({ days: 14 });
  const { data: analytics, loading: analyticsLoading } = useAIAnalytics();
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");

  const loading = providersLoading || healthLoading || usageLoading || analyticsLoading;

  const enrichedProviders = providers.map((p) => ({
    ...p,
    health: healthData.find((h) => h.provider === p.name)?.health ?? null,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">AI Administration</h1>
          <p className="text-gray-500 text-sm">Manage AI providers, monitor health, and view analytics</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <>
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <StatsCard
                title="Total Requests"
                value={analytics.requests.totalRequests}
                subtitle="All time"
                trend={
                  analytics.requests.successRate > 90
                    ? { value: analytics.requests.successRate, direction: "up" }
                    : { value: 100 - analytics.requests.successRate, direction: "down" }
                }
              />
              <StatsCard
                title="Success Rate"
                value={`${analytics.requests.successRate.toFixed(1)}%`}
                subtitle="Last 30 days"
              />
              <StatsCard
                title="Avg Latency"
                value={`${analytics.requests.averageLatency.toFixed(0)}ms`}
                subtitle="Across all providers"
              />
              <StatsCard
                title="Total Cost"
                value={`$${analytics.requests.totalCost.toFixed(4)}`}
                subtitle="All providers"
              />
            </div>
          )}

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">AI Providers</h2>
              <span className="text-sm text-gray-400">{enrichedProviders.length} registered</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrichedProviders.map((p) => (
                <ProviderCard key={p.id} provider={p} />
              ))}
            </div>
          </div>

          {usage.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Usage Trend (14 days)</h2>
              <div className="bg-white rounded-lg border p-4">
                <UsageChart data={usage} metric="totalTokens" />
              </div>
            </div>
          )}

          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="rounded-lg border p-4 bg-white">
                <h3 className="font-semibold mb-3">Provider Usage</h3>
                {analytics.providerUsage.length === 0 ? (
                  <p className="text-gray-400 text-sm">No data</p>
                ) : (
                  <div className="space-y-2">
                    {analytics.providerUsage.map((pu) => (
                      <div key={pu.provider.id} className="flex items-center justify-between text-sm">
                        <span>{pu.provider.displayName}</span>
                        <span className="font-mono">
                          {pu.totalTokens.toLocaleString()} tokens
                          {pu.totalCost > 0 && ` ($${pu.totalCost.toFixed(4)})`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-lg border p-4 bg-white">
                <h3 className="font-semibold mb-3">Model Usage</h3>
                {analytics.modelUsage.length === 0 ? (
                  <p className="text-gray-400 text-sm">No data</p>
                ) : (
                  <div className="space-y-2">
                    {analytics.modelUsage.slice(0, 10).map((mu) => (
                      <div key={mu.model} className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-[200px]">{mu.model}</span>
                        <span className="font-mono">{mu.requestCount} requests</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
