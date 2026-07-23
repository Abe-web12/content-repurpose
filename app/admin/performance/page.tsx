"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePerformance } from "@/hooks/use-performance";
import { GaugeChart, BarChartCard, LineChartCard } from "@/components/charts";
import { Activity, Cpu, Database, Zap, Server } from "lucide-react";

export default function AdminPerformancePage() {
  const { metrics, series, loading, refetch } = usePerformance();
  const [minutes, setMinutes] = useState(60);

  useEffect(() => {
    refetch(minutes);
    const id = setInterval(() => refetch(minutes), 30000);
    return () => clearInterval(id);
  }, [minutes, refetch]);

  if (loading || !metrics) {
    return <div className="p-6 text-text-muted">Loading performance metrics...</div>;
  }

  const gauges = [
    { label: "API Latency", value: metrics.apiLatency, max: 500 },
    { label: "Error Rate", value: metrics.errorRate, max: 100 },
    { label: "Memory", value: metrics.memoryUsage, max: 100 },
    { label: "CPU", value: metrics.cpuUsage, max: 100 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Performance Analytics</h1>
          <p className="text-text-secondary text-sm">API latency, cache, queues and resource usage</p>
        </div>
        <select className="border rounded-md p-2 bg-white" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
          <option value={30}>30 min</option>
          <option value={60}>60 min</option>
          <option value={360}>6 hours</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {gauges.map((g) => (
          <Card key={g.label}>
            <CardHeader className="pb-0"><CardTitle className="text-sm text-text-secondary flex items-center gap-1"><Activity className="w-3 h-3" /> {g.label}</CardTitle></CardHeader>
            <CardContent><GaugeChart value={g.value} max={g.max} label={g.label} /></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="p-4 flex items-center gap-3"><Cpu className="w-5 h-5 text-text-muted" /><div><div className="text-text-muted text-sm">DB Queries</div><div className="text-xl font-bold">{metrics.dbQueries}</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Zap className="w-5 h-5 text-text-muted" /><div><div className="text-text-muted text-sm">Cache Hit Ratio</div><div className="text-xl font-bold">{metrics.cacheHitRatio}%</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Server className="w-5 h-5 text-text-muted" /><div><div className="text-text-muted text-sm">Background Jobs</div><div className="text-xl font-bold">{metrics.backgroundJobs}</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Database className="w-5 h-5 text-text-muted" /><div><div className="text-text-muted text-sm">Search Perf</div><div className="text-xl font-bold">{metrics.searchPerformance}ms</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Database className="w-5 h-5 text-text-muted" /><div><div className="text-text-muted text-sm">Upload Perf</div><div className="text-xl font-bold">{metrics.uploadPerformance}ms</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Activity className="w-5 h-5 text-text-muted" /><div><div className="text-text-muted text-sm">Response Time</div><div className="text-xl font-bold">{metrics.responseTime}ms</div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Latency Over Time</CardTitle></CardHeader>
        <CardContent>
          <LineChartCard data={series.map((s, i) => ({ index: i, apiLatency: s.apiLatency }))} dataKey="apiLatency" xKey="index" label="latency over time" />
        </CardContent>
      </Card>
    </div>
  );
}
