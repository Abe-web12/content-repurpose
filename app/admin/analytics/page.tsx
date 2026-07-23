"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExecutiveDashboard } from "@/hooks/use-executive";
import { ExecutiveKpiCards } from "@/components/analytics/executive-kpi-cards";

export default function AdminAnalyticsPage() {
  const { metrics, realtime, loading, refetch } = useExecutiveDashboard();

  useEffect(() => {
    refetch();
    const id = setInterval(refetch, 30000);
    return () => clearInterval(id);
  }, [refetch]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Executive Dashboard</h1>
          <p className="text-text-secondary text-sm">Real-time business intelligence across your organization</p>
        </div>
        <span className="text-xs text-green-600 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live
        </span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-muted">Loading executive metrics...</div>
      ) : (
        <>
          <ExecutiveKpiCards metrics={metrics} />
          {realtime && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Real-time Activity</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><div className="text-text-muted">Active Users</div><div className="text-xl font-bold">{realtime.activeUsers}</div></div>
                <div><div className="text-text-muted">Requests/min</div><div className="text-xl font-bold">{realtime.requestsPerMinute}</div></div>
                <div><div className="text-text-muted">AI Requests/min</div><div className="text-xl font-bold">{realtime.aiRequestsPerMinute}</div></div>
                <div><div className="text-text-muted">Workflows/min</div><div className="text-xl font-bold">{realtime.workflowRunsPerMinute}</div></div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
