"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, DollarSign, BarChart3, CheckCircle2, XCircle, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PromptExecution {
  id: string;
  provider: string;
  model: string;
  latency: number;
  cost: number;
  tokens: number;
  success: boolean;
  rating: number | null;
  createdAt: string | Date;
}

interface EvaluationChartsProps {
  executions: PromptExecution[];
}

function BarChart({
  data,
  valueKey,
  labelKey,
  color,
  format,
}: {
  data: { label: string; value: number }[];
  valueKey: string;
  labelKey: string;
  color: string;
  format: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 0.01);

  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-primary font-medium truncate">{item.label}</span>
            <span className="text-text-muted">{format(item.value)}</span>
          </div>
          <div className="relative h-5 w-full rounded-full bg-surface-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={cn("h-full rounded-full", color)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TokenBreakdown({ executions }: { executions: PromptExecution[] }) {
  const total = executions.reduce((s, e) => s + e.tokens, 0);
  if (total === 0) return null;

  const groups = executions.reduce<Record<string, number>>((acc, e) => {
    const key = `${e.provider}/${e.model}`;
    acc[key] = (acc[key] || 0) + e.tokens;
    return acc;
  }, {});

  const entries = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  const colors = ["bg-brand-500", "bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-green-500", "bg-pink-500"];

  return (
    <div className="space-y-2">
      <div className="flex h-3 w-full rounded-full overflow-hidden">
        {entries.map(([key, val], idx) => (
          <motion.div
            key={key}
            initial={{ width: 0 }}
            animate={{ width: `${(val / total) * 100}%` }}
            transition={{ duration: 0.5, delay: idx * 0.05 }}
            className={cn("h-full", colors[idx % colors.length])}
            title={`${key}: ${val.toLocaleString()} tokens`}
          />
        ))}
      </div>
      <div className="space-y-1">
        {entries.map(([key, val], idx) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", colors[idx % colors.length])} />
            <span className="text-text-primary truncate">{key}</span>
            <span className="text-text-muted">{((val / total) * 100).toFixed(1)}%</span>
            <span className="text-text-muted">({val.toLocaleString()} tok)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EvaluationCharts({ executions }: EvaluationChartsProps) {
  const latencyData = useMemo(() => {
    const groups = executions.reduce<Record<string, number[]>>((acc, e) => {
      const key = `${e.provider}/${e.model}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(e.latency);
      return acc;
    }, {});
    return Object.entries(groups)
      .map(([label, vals]) => ({
        label,
        value: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      }))
      .sort((a, b) => b.value - a.value);
  }, [executions]);

  const costData = useMemo(() => {
    const groups = executions.reduce<Record<string, number[]>>((acc, e) => {
      const key = `${e.provider}/${e.model}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(e.cost);
      return acc;
    }, {});
    return Object.entries(groups)
      .map(([label, vals]) => ({
        label,
        value: vals.reduce((a, b) => a + b, 0) / vals.length,
      }))
      .sort((a, b) => b.value - a.value);
  }, [executions]);

  const successRate = useMemo(() => {
    if (executions.length === 0) return 100;
    return Math.round((executions.filter((e) => e.success).length / executions.length) * 100);
  }, [executions]);

  const ratingDist = useMemo(() => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    executions.forEach((e) => {
      if (e.rating) dist[e.rating] = (dist[e.rating] || 0) + 1;
    });
    return dist;
  }, [executions]);

  const totalRatings = Object.values(ratingDist).reduce((a, b) => a + b, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Latency by Provider/Model
          </CardTitle>
        </CardHeader>
        <CardContent>
          {latencyData.length > 0 ? (
            <BarChart
              data={latencyData}
              valueKey="value"
              labelKey="label"
              color="bg-brand-500"
              format={(v) => `${v}ms`}
            />
          ) : (
            <p className="text-xs text-text-muted text-center py-4">No data</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Cost by Provider/Model
          </CardTitle>
        </CardHeader>
        <CardContent>
          {costData.length > 0 ? (
            <BarChart
              data={costData}
              valueKey="value"
              labelKey="label"
              color="bg-green-500"
              format={(v) => `$${v.toFixed(6)}`}
            />
          ) : (
            <p className="text-xs text-text-muted text-center py-4">No data</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Success Rate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Progress value={successRate} indicatorClassName={successRate >= 90 ? "bg-green-500" : successRate >= 70 ? "bg-amber-500" : "bg-red-500"} />
            </div>
            <span className={cn(
              "text-lg font-bold",
              successRate >= 90 ? "text-green-600" : successRate >= 70 ? "text-amber-600" : "text-red-600"
            )}>
              {successRate}%
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Successful: {executions.filter((e) => e.success).length}</span>
            <span>Failed: {executions.filter((e) => !e.success).length}</span>
            <span>Total: {executions.length}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="h-4 w-4" />
            Rating Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {totalRatings > 0 ? (
            [5, 4, 3, 2, 1].map((star) => {
              const count = ratingDist[star] || 0;
              const pct = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-6 text-text-muted">{star}★</span>
                  <div className="flex-1 h-3 rounded-full bg-surface-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.4 }}
                      className="h-full rounded-full bg-amber-400"
                    />
                  </div>
                  <span className="w-8 text-right text-text-muted">{count}</span>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-text-muted text-center py-4">No ratings yet</p>
          )}
        </CardContent>
      </Card>

      <Card className="sm:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Token Usage Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TokenBreakdown executions={executions} />
        </CardContent>
      </Card>
    </div>
  );
}
