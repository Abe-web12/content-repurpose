"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface DailyPoint {
  date: string;
  count: number;
}

interface DailyChartProps {
  series: DailyPoint[];
  forecast?: DailyPoint[];
  className?: string;
}

const SHORT_MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

function fmtLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function DailyChart({ series, forecast = [], className }: DailyChartProps) {
  const all = useMemo(() => {
    return [...series, ...forecast.map((f) => ({ ...f, isForecast: true }))];
  }, [series, forecast]);

  const max = useMemo(
    () => Math.max(...all.map((d) => d.count), 1),
    [all]
  );

  const W = 680;
  const H = 220;
  const PAD_L = 36;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 36;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const n = all.length;
  const xStep = n > 1 ? chartW / (n - 1) : chartW;

  const points = all.map((d, i) => ({
    x: PAD_L + i * xStep,
    y: PAD_T + chartH - (d.count / max) * chartH,
    count: d.count,
    date: d.date,
    isForecast: (d as { isForecast?: boolean }).isForecast ?? false,
  }));

  const historicPoints = points.filter((p) => !p.isForecast);
  const forecastPoints = points.filter((p) => p.isForecast);

  const linePath = (pts: typeof points) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  const areaPath = (pts: typeof points) =>
    pts.length === 0
      ? ""
      : `${linePath(pts)} L ${pts[pts.length - 1].x.toFixed(1)} ${(PAD_T + chartH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(PAD_T + chartH).toFixed(1)} Z`;

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    val: Math.round(max * t),
    y: PAD_T + chartH - chartH * t,
  }));

  // X labels (show ~6)
  const labelStep = Math.max(1, Math.ceil(all.length / 6));
  const xLabels = all.filter((_, i) => i % labelStep === 0 || i === all.length - 1);

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Daily generation chart"
        className="min-w-[320px]"
      >
        <title>Daily generations</title>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((t) => (
          <line
            key={t.val}
            x1={PAD_L}
            y1={t.y}
            x2={W - PAD_R}
            y2={t.y}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((t) => (
          <text
            key={t.val}
            x={PAD_L - 6}
            y={t.y}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize="11"
            fill="#9ca3af"
          >
            {t.val}
          </text>
        ))}

        {/* X-axis labels */}
        {xLabels.map((d) => {
          const idx = all.findIndex((a) => a.date === d.date);
          const x = PAD_L + idx * xStep;
          return (
            <text
              key={d.date}
              x={x}
              y={H - 6}
              textAnchor="middle"
              fontSize="11"
              fill="#9ca3af"
            >
              {fmtLabel(d.date)}
            </text>
          );
        })}

        {/* Historic area fill */}
        {historicPoints.length > 1 && (
          <path d={areaPath(historicPoints)} fill="url(#areaGrad)" />
        )}

        {/* Forecast area fill */}
        {forecastPoints.length > 1 && (
          <path d={areaPath(forecastPoints)} fill="url(#forecastGrad)" />
        )}

        {/* Historic line */}
        {historicPoints.length > 1 && (
          <path
            d={linePath(historicPoints)}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}

        {/* Forecast line (dashed) */}
        {forecastPoints.length > 1 && (
          <path
            d={linePath(forecastPoints)}
            fill="none"
            stroke="#a855f7"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {historicPoints.map((p) => (
          <circle
            key={p.date}
            cx={p.x}
            cy={p.y}
            r="3.5"
            fill="#6366f1"
            stroke="white"
            strokeWidth="1.5"
          >
            <title>{`${fmtLabel(p.date)}: ${p.count}`}</title>
          </circle>
        ))}

        {forecastPoints.map((p) => (
          <circle
            key={p.date + "-fc"}
            cx={p.x}
            cy={p.y}
            r="3.5"
            fill="#a855f7"
            stroke="white"
            strokeWidth="1.5"
            opacity="0.8"
          >
            <title>{`${fmtLabel(p.date)}: ${p.count} (forecast)`}</title>
          </circle>
        ))}
      </svg>

      {/* Legend */}
      {forecast.length > 0 && (
        <div className="mt-1 flex items-center gap-4 px-1">
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="h-0.5 w-5 rounded bg-brand-500 inline-block" />
            Actual
          </span>
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span
              className="inline-block h-0.5 w-5 rounded"
              style={{ background: "repeating-linear-gradient(to right,#a855f7 0,#a855f7 4px,transparent 4px,transparent 8px)" }}
            />
            Forecast
          </span>
        </div>
      )}
    </div>
  );
}