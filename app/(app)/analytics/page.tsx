"use client";

import { useState } from "react";
import { Sparkles, Cpu, CreditCard, BarChart3, Users, DollarSign, TrendingUp, Activity } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FadeUp, Stagger } from "@/components/shared/motion";
import { useAnalytics, useAlerts, useForecast, useBenchmarks, useRevenue, useUserGrowth, useAIUsage, useWorkflowMetrics, useExport } from "@/hooks/use-analytics";
import { StatCard } from "@/components/analytics/stat-card";
import { KPIGrid } from "@/components/analytics/kpi-grid";
import { DailyChart } from "@/components/analytics/daily-chart";
import { FormatBreakdown } from "@/components/analytics/format-breakdown";
import { ForecastPanel } from "@/components/analytics/forecast-panel";
import { BenchmarksPanel } from "@/components/analytics/benchmarks-panel";
import { AlertsCenter } from "@/components/analytics/alerts-center";
import { AlertCard } from "@/components/analytics/alert-card";
import { BenchmarkCard } from "@/components/analytics/benchmark-card";
import { RevenueChart } from "@/components/analytics/revenue-chart";
import { UserGrowthChart } from "@/components/analytics/user-growth-chart";
import { AIUsageChart } from "@/components/analytics/ai-usage-chart";
import { WorkflowChart } from "@/components/analytics/workflow-chart";
import { ForecastChartDisplay } from "@/components/analytics/forecast-chart";
import { ExportButton } from "@/components/analytics/export-button";
import { DateRangePicker } from "@/components/analytics/date-range-picker";
import { LoadingSkeleton } from "@/components/analytics/loading-skeleton";
import { EmptyState } from "@/components/analytics/empty-state";

const FORMAT_LABELS: Record<string, string> = {
  linkedin_post: "LinkedIn Post",
  linkedin_carousel: "Carousel",
  twitter_thread: "X Thread",
};

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState("overview");
  const { data, loading } = useAnalytics(days);
  const overview = data?.overview;

  const { revenue } = useRevenue(undefined, days <= 7 ? "7d" : days <= 30 ? "30d" : days <= 90 ? "90d" : "365d");
  const { growth, segments, retentionRate: userRetention } = useUserGrowth(undefined, days <= 7 ? "7d" : days <= 30 ? "30d" : days <= 90 ? "90d" : "365d");
  const { metrics: aiMetrics, overview: aiOverview } = useAIUsage(undefined, days <= 7 ? "7d" : days <= 30 ? "30d" : days <= 90 ? "90d" : "365d");
  const { data: workflowData } = useWorkflowMetrics(undefined, days <= 7 ? "7d" : days <= 30 ? "30d" : days <= 90 ? "90d" : "365d");
  const { prediction: forecastData } = useForecast();
  const { result: benchmarkResult, loading: benchLoading } = useBenchmarks();
  const { alerts, history, actOnEvent } = useAlerts();
  const { loading: exportLoading, exportData } = useExport();

  if (loading) return <LoadingSkeleton charts={3} cards={4} />;

  if (!data) {
    return (
      <div className="space-y-8">
        <PageHeader title="Analytics" description="Track your content generation performance and trends." />
        <EmptyState title="Failed to load analytics" description="Please refresh the page or try again later." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Track your content generation performance and trends."
        action={
          <div className="flex items-center gap-3">
            <DateRangePicker value={days} onChange={setDays} />
            <ExportButton days={days} type="generations" />
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="ai">AI Usage</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 mt-6">
          <Stagger className="space-y-8">
            <FadeUp>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Generations" value={overview?.totalGenerations ?? 0} changePct={overview?.changePct} subtitle="vs previous period" icon={Sparkles} />
                <StatCard title="Tokens Used" value={overview?.tokensUsed ? overview.tokensUsed.toLocaleString() : "0"} changePct={overview?.tokensChangePct} subtitle="vs previous period" icon={Cpu} />
                <StatCard title="Credits Used" value={overview?.creditsUsed ?? 0} subtitle={`past ${days} days`} icon={CreditCard} />
                <StatCard title="Top Format" value={overview?.topFormat ? FORMAT_LABELS[overview.topFormat] ?? overview.topFormat : "—"} subtitle={`avg ${overview?.avgPerDay ?? 0}/day`} icon={BarChart3} />
              </div>
            </FadeUp>

            <FadeUp delay={0.05}>
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Daily Generations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DailyChart series={data.dailySeries} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Format Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormatBreakdown data={data.formatBreakdown} />
                  </CardContent>
                </Card>
              </div>
            </FadeUp>

            <FadeUp delay={0.08}>
              <AlertsCenter alerts={data.alerts} />
            </FadeUp>

            <FadeUp delay={0.1}>
              <div className="grid gap-6 lg:grid-cols-2">
                <ForecastPanel history={data.dailySeries} forecast={data.forecast} />
                <BenchmarksPanel benchmarks={data.benchmarks} />
              </div>
            </FadeUp>
          </Stagger>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6 mt-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="MRR" value={overview?.totalGenerations ?? 0} subtitle="Monthly Recurring Revenue" icon={DollarSign} />
            <StatCard title="ARR" value="—" subtitle="Annual Run Rate" icon={TrendingUp} />
            <StatCard title="Churn" value="—" subtitle="Customer churn rate" icon={Activity} />
            <StatCard title="LTV" value="—" subtitle="Lifetime Value" icon={DollarSign} />
          </div>
          <RevenueChart
            data={revenue.length > 0 ? revenue : Array.from({ length: days + 1 }, (_, i) => {
              const d = new Date(); d.setDate(d.getDate() - (days - i));
              return { date: d.toISOString().slice(0, 10), mrr: 0, arr: 0, grossRevenue: 0, netRevenue: 0 };
            })}
            title="Revenue Trend"
          />
        </TabsContent>

        <TabsContent value="users" className="space-y-6 mt-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <StatCard title="Active Users" value={segments?.[0]?.count ?? 0} subtitle="Last 30 days" icon={Users} />
            <StatCard title="Retention Rate" value={`${userRetention}%`} subtitle="User retention" icon={TrendingUp} />
            <StatCard title="Total Segments" value={segments?.length ?? 0} subtitle="Customer segments" icon={BarChart3} />
          </div>
          {growth.length > 0 ? (
            <UserGrowthChart data={growth} />
          ) : (
            <EmptyState title="No user growth data" description="User growth data will appear once you have members in your organization." />
          )}
        </TabsContent>

        <TabsContent value="ai" className="space-y-6 mt-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="AI Requests" value={aiOverview?.totalRequests?.toLocaleString() ?? "0"} subtitle="Total requests" icon={Cpu} />
            <StatCard title="Tokens Used" value={aiOverview?.totalTokens?.toLocaleString() ?? "0"} subtitle="Total tokens" icon={Cpu} />
            <StatCard title="Total Cost" value={aiOverview?.totalCost ? `$${aiOverview.totalCost.toFixed(2)}` : "$0"} subtitle="AI costs" icon={DollarSign} />
            <StatCard title="Success Rate" value={aiOverview?.successRate ? `${aiOverview.successRate}%` : "100%"} subtitle="AI success rate" icon={Activity} />
          </div>
          {aiMetrics.length > 0 ? (
            <AIUsageChart data={aiMetrics} title="AI Requests Over Time" />
          ) : (
            <EmptyState title="No AI usage data" description="AI usage metrics will appear once your organization uses AI features." />
          )}
        </TabsContent>

        <TabsContent value="workflows" className="space-y-6 mt-6">
          {workflowData.length > 0 ? (
            <WorkflowChart data={workflowData} />
          ) : (
            <EmptyState title="No workflow data" description="Workflow metrics will appear once your team runs workflows." />
          )}
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6 mt-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <StatCard title="Confidence" value={forecastData ? `${forecastData.confidence}%` : "—"} subtitle="Forecast confidence" icon={Activity} />
            <StatCard title="Trend" value={forecastData?.trend ?? "—"} subtitle="Predicted direction" icon={TrendingUp} />
            <StatCard title="Growth" value={forecastData ? `${forecastData.growth}%` : "—"} subtitle="Predicted growth" icon={TrendingUp} />
          </div>
          {forecastData ? (
            <ForecastChartDisplay data={forecastData.predictions} title={`${forecastData.metric.charAt(0).toUpperCase() + forecastData.metric.slice(1)} Forecast`} />
          ) : (
            <EmptyState title="No forecast data" description="Revenue-based forecasts will appear once historical data is available." icon={TrendingUp} />
          )}
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-6 mt-6">
          {benchmarkResult ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[benchmarkResult].map((b, i) => (
                <BenchmarkCard
                  key={i}
                  metric={b.metric}
                  orgValue={b.organization.value}
                  percentile={b.organization.percentile}
                  average={b.average}
                  median={b.median}
                  topPerformer={b.topPerformer}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No benchmark data" description="Benchmarks require at least one other organization to compare against." />
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Alert History</h3>
            <ExportButton days={days} type="generations" />
          </div>
          {history.length > 0 ? (
            <div className="space-y-3">
              {history.map((event) => (
                <AlertCard
                  key={event.id}
                  event={event}
                  onAcknowledge={(id) => actOnEvent(id, "acknowledge")}
                  onResolve={(id) => actOnEvent(id, "resolve")}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No alerts" description="You have no alert history. Alerts will appear when metric thresholds are exceeded." icon={Activity} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
