"use client";

import { Cell, PieChart, Pie, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface PlatformBreakdownProps {
  data: { name: string; value: number }[];
}

const COLORS: Record<string, string> = {
  linkedin_post: "#0a66c2",
  twitter_thread: "#1da1f2",
  linkedin_carousel: "#7c3aed",
  newsletter: "#ea580c",
  blog: "#059669",
  marketing: "#dc2626",
  other: "#6b7280",
};

export function PlatformBreakdown({ data }: PlatformBreakdownProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-text-muted">
        No platform data yet
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    value: d.value,
    color: COLORS[d.name] || "#6b7280",
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "#1f2937",
            border: "none",
            borderRadius: "8px",
            color: "#f9fafb",
            fontSize: "12px",
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => (
            <span style={{ color: "#6b7280", fontSize: "11px" }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
