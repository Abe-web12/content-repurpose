"use client";

import { useAIProviders, useAIUsage, useAIAnalytics } from "@/hooks/use-ai";
import { StatsCard } from "@/components/ai/stats-card";
import { UsageChart } from "@/components/ai/usage-chart";

export default function AIPage() {
  const { providers } = useAIProviders();
  const { usage } = useAIUsage({ days: 7 });
  const { data: analytics } = useAIAnalytics("daily");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">AI Playground</h1>
        <p className="text-gray-500 text-sm">Monitor AI usage and available providers</p>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatsCard title="Requests Today" value={analytics.requests.totalRequests} />
          <StatsCard
            title="Avg Response Time"
            value={`${analytics.requests.averageLatency.toFixed(0)}ms`}
          />
          <StatsCard
            title="Success Rate"
            value={`${analytics.requests.successRate.toFixed(1)}%`}
          />
          <StatsCard
            title="Cost Today"
            value={`$${analytics.requests.totalCost.toFixed(4)}`}
          />
        </div>
      )}

      {usage.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Usage (7 days)</h2>
          <div className="bg-white rounded-lg border p-4">
            <UsageChart data={usage} metric="totalTokens" />
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">Available Providers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.filter((p) => p.isEnabled).map((p) => {
            const healthColor =
              p.health?.status === "healthy" ? "bg-green-500"
              : p.health?.status === "degraded" ? "bg-yellow-500"
              : "bg-gray-300";
            return (
              <div key={p.id} className="rounded-lg border p-4 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${healthColor}`} />
                  <h3 className="font-semibold">{p.displayName}</h3>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>Model: {p.defaultModel}</p>
                  <p>Type: {p.type}</p>
                  {p.health && <p>Latency: {p.health.latency.toFixed(0)}ms</p>}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.capabilities.map((cap) => (
                    <span key={cap} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
