"use client";

export interface AgentAnalytics {
  totalRuns: number;
  successRate: number;
  avgDuration: number;
  totalTokens: number;
  totalCost: number;
}

interface AnalyticsCardsProps {
  readonly analytics: AgentAnalytics;
  readonly toolStats: { tool: string; count: number }[];
  readonly loading: boolean;
}

function StatCard({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border rounded p-3 flex flex-col gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}

export function AnalyticsCards({ analytics, toolStats, loading }: AnalyticsCardsProps) {
  if (loading) {
    return <div className="rounded-lg border p-4 text-sm text-gray-500">Loading analytics...</div>;
  }

  return (
    <div className="rounded-lg border p-4 flex flex-col gap-3">
      <h3 className="font-semibold text-lg">Analytics</h3>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Runs" value={analytics.totalRuns.toLocaleString()} />
        <StatCard label="Success Rate" value={`${analytics.successRate.toFixed(1)}%`} />
        <StatCard label="Avg Duration" value={`${analytics.avgDuration.toFixed(0)}ms`} />
        <StatCard label="Total Tokens" value={analytics.totalTokens.toLocaleString()} />
        <StatCard label="Total Cost" value={`$${analytics.totalCost.toFixed(4)}`} />
      </div>
      {toolStats.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium">Tool Usage</h4>
          <div className="flex flex-wrap gap-2">
            {toolStats.map((stat) => (
              <span
                key={stat.tool}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
              >
                {stat.tool}: {stat.count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
