"use client";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; direction: "up" | "down" };
}

export function StatsCard({ title, value, subtitle, trend }: StatsCardProps) {
  return (
    <div className="rounded-lg border p-4 bg-white">
      <div className="text-sm text-gray-500 mb-1">{title}</div>
      <div className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</div>
      <div className="flex items-center gap-2 mt-1">
        {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
        {trend && (
          <span className={`text-xs font-medium ${trend.direction === "up" ? "text-green-600" : "text-red-600"}`}>
            {trend.direction === "up" ? "↑" : "↓"} {Math.abs(trend.value).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
