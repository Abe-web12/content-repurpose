"use client";

import * as React from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ScatterChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Treemap, Funnel, FunnelChart, LabelList, RadialBarChart, RadialBar,
} from "recharts";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6",
];

export const chartColors = CHART_COLORS;

const axisProps = {
  stroke: "currentColor",
  tick: { fill: "currentColor", fontSize: 11 },
  tickLine: false,
};

function ChartFrame({ className, children, label }: { className?: string; children: React.ReactNode; label?: string }) {
  return (
    <div
      className={cn("w-full h-72 text-text-secondary", className)}
      role="img"
      aria-label={label || "chart"}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

export interface SeriesPoint { [key: string]: string | number; }

export function AreaChartCard({ data, dataKey, xKey = "date", color, label }: { data: SeriesPoint[]; dataKey: string; xKey?: string; color?: string; label?: string }) {
  return (
    <ChartFrame label={label}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color || CHART_COLORS[0]} stopOpacity={0.8} />
            <stop offset="95%" stopColor={color || CHART_COLORS[0]} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "none", borderRadius: 8, color: "#fff" }} />
        <Area type="monotone" dataKey={dataKey} stroke={color || CHART_COLORS[0]} fill={`url(#grad-${dataKey})`} animationDuration={600} />
      </AreaChart>
    </ChartFrame>
  );
}

export function LineChartCard({ data, dataKey, xKey = "date", color, label }: { data: SeriesPoint[]; dataKey: string; xKey?: string; color?: string; label?: string }) {
  return (
    <ChartFrame label={label}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "none", borderRadius: 8, color: "#fff" }} />
        <Line type="monotone" dataKey={dataKey} stroke={color || CHART_COLORS[0]} strokeWidth={2} dot={false} animationDuration={600} />
      </LineChart>
    </ChartFrame>
  );
}

export function BarChartCard({ data, dataKey, xKey = "date", color, stacked, label }: { data: SeriesPoint[]; dataKey: string; xKey?: string; color?: string; stacked?: boolean; label?: string }) {
  return (
    <ChartFrame label={label}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip cursor={{ fill: "currentColor", opacity: 0.1 }} contentStyle={{ background: "rgba(0,0,0,0.8)", border: "none", borderRadius: 8, color: "#fff" }} />
        <Bar dataKey={dataKey} fill={color || CHART_COLORS[0]} stackId={stacked ? "a" : undefined} radius={[4, 4, 0, 0]} animationDuration={600} />
      </BarChart>
    </ChartFrame>
  );
}

export function StackedBarChart({ data, keys, xKey = "date", label }: { data: SeriesPoint[]; keys: string[]; xKey?: string; label?: string }) {
  return (
    <ChartFrame label={label}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "none", borderRadius: 8, color: "#fff" }} />
        <Legend />
        {keys.map((k, i) => (
          <Bar key={k} dataKey={k} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[2, 2, 0, 0]} animationDuration={600} />
        ))}
      </BarChart>
    </ChartFrame>
  );
}

export function PieChartCard({ data, nameKey = "name", dataKey = "value", label }: { data: { name: string; value: number }[]; nameKey?: string; dataKey?: string; label?: string }) {
  return (
    <ChartFrame label={label}>
      <PieChart>
        <Pie data={data} dataKey={dataKey} nameKey={nameKey} outerRadius="80%" innerRadius="50%" paddingAngle={2} animationDuration={600} label>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "none", borderRadius: 8, color: "#fff" }} />
        <Legend />
      </PieChart>
    </ChartFrame>
  );
}

export function ScatterChartCard({ data, xKey, yKey, zKey, label }: { data: SeriesPoint[]; xKey: string; yKey: string; zKey?: string; label?: string }) {
  return (
    <ChartFrame label={label}>
      <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
        <XAxis type="number" dataKey={xKey} {...axisProps} />
        <YAxis type="number" dataKey={yKey} {...axisProps} />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "rgba(0,0,0,0.8)", border: "none", borderRadius: 8, color: "#fff" }} />
        <Scatter data={data} fill={CHART_COLORS[0]} animationDuration={600} />
      </ScatterChart>
    </ChartFrame>
  );
}

export function RadarChartCard({ data, dataKey, label }: { data: { subject: string; value: number }[]; dataKey: string; label?: string }) {
  return (
    <ChartFrame label={label}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke="currentColor" opacity={0.2} />
        <PolarAngleAxis dataKey="subject" tick={{ fill: "currentColor", fontSize: 11 }} />
        <PolarRadiusAxis tick={{ fill: "currentColor", fontSize: 10 }} />
        <Radar dataKey={dataKey} stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.4} animationDuration={600} />
        <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "none", borderRadius: 8, color: "#fff" }} />
      </RadarChart>
    </ChartFrame>
  );
}

export function GaugeChart({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <ChartFrame label={label || `gauge ${pct}%`}>
      <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: "g", value: pct, fill: CHART_COLORS[0] }]} startAngle={210} endAngle={-30}>
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
        <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "currentColor", opacity: 0.1 }} />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="currentColor" fontSize={22} fontWeight={700}>{Math.round(pct)}%</text>
      </RadialBarChart>
    </ChartFrame>
  );
}

export function FunnelChartCard({ data, label }: { data: { name: string; value: number }[]; label?: string }) {
  return (
    <ChartFrame label={label}>
      <FunnelChart>
        <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "none", borderRadius: 8, color: "#fff" }} />
        <Funnel dataKey="value" data={data} isAnimationActive>
          <LabelList position="right" fill="currentColor" stroke="none" dataKey="name" />
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Funnel>
      </FunnelChart>
    </ChartFrame>
  );
}

export function TreemapChart({ data, label }: { data: { name: string; size: number }[]; label?: string }) {
  return (
    <ChartFrame label={label}>
      <Treemap data={data} dataKey="size" stroke="currentColor" nameKey="name" animationDuration={400}>
        {data.map((_, i) => (
          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
        ))}
      </Treemap>
    </ChartFrame>
  );
}

export function HeatmapChart({ data, label }: { data: { x: string; y: string; value: number }[]; label?: string }) {
  return (
    <ChartFrame label={label}>
      <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
        <XAxis type="category" dataKey="x" {...axisProps} />
        <YAxis type="category" dataKey="y" {...axisProps} />
        <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "none", borderRadius: 8, color: "#fff" }} />
        <Scatter data={data} animationDuration={400}>
          {data.map((d, i) => (
            <Cell key={i} fill={CHART_COLORS[Math.min(CHART_COLORS.length - 1, Math.floor(d.value / 20))]} />
          ))}
        </Scatter>
      </ScatterChart>
    </ChartFrame>
  );
}

export function TimelineChart({ data, label }: { data: { time: string; label: string; status?: string }[]; label?: string }) {
  return (
    <ChartFrame label={label}>
      <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
        <XAxis type="category" dataKey="time" {...axisProps} />
        <YAxis type="category" dataKey="label" {...axisProps} />
        <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "none", borderRadius: 8, color: "#fff" }} />
        <Scatter data={data} fill={CHART_COLORS[2]} animationDuration={400} />
      </ScatterChart>
    </ChartFrame>
  );
}

export function WaterfallChart({ data, label }: { data: { name: string; value: number }[]; label?: string }) {
  const cumulative: { name: string; value: number; base: number }[] = data.map((d, i) => {
    if (i === 0) return { ...d, base: 0 };
    const prev = cumulative[i - 1];
    return { ...d, base: prev.base + (prev.value >= 0 ? prev.value : 0) };
  });
  return (
    <ChartFrame label={label}>
      <ComposedChart data={cumulative} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
        <XAxis dataKey="name" {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "none", borderRadius: 8, color: "#fff" }} />
        <Bar dataKey="base" stackId="a" fill="transparent" />
        <Bar dataKey="value" stackId="a" radius={[4, 4, 0, 0]} animationDuration={600}>
          {cumulative.map((d, i) => (
            <Cell key={i} fill={d.value >= 0 ? CHART_COLORS[1] : CHART_COLORS[3]} />
          ))}
        </Bar>
      </ComposedChart>
    </ChartFrame>
  );
}

export function ForecastChart({ data, label }: { data: { date: string; actual?: number; predicted: number; lowerBound: number; upperBound: number }[]; label?: string }) {
  return (
    <ChartFrame label={label}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
        <XAxis dataKey="date" {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "none", borderRadius: 8, color: "#fff" }} />
        <Legend />
        <Area dataKey="upperBound" stroke="none" fill={CHART_COLORS[0]} fillOpacity={0.15} name="Upper" />
        <Area dataKey="lowerBound" stroke="none" fill="#fff" fillOpacity={1} name="Lower" />
        <Line dataKey="actual" stroke={CHART_COLORS[1]} dot={false} name="Actual" />
        <Line dataKey="predicted" stroke={CHART_COLORS[0]} strokeDasharray="5 5" dot={false} name="Predicted" />
      </ComposedChart>
    </ChartFrame>
  );
}

export function SunburstChart({ data, label }: { data: { name: string; size: number; children?: { name: string; size: number }[] }[]; label?: string }) {
  return (
    <ChartFrame label={label}>
      <Treemap data={data} dataKey="size" stroke="currentColor" nameKey="name" animationDuration={400} aspectRatio={4 / 3}>
        {data.map((_, i) => (
          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
        ))}
      </Treemap>
    </ChartFrame>
  );
}
