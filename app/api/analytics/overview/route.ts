export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { rateLimitByUser } from "@/lib/utils/rate-limit";

// ─── helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function subDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - n);
  return r;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function linearForecast(values: number[], steps = 7): number[] {
  const n = values.length;
  if (n < 2) return Array(steps).fill(values[0] ?? 0);
  const sumX = (n * (n - 1)) / 2;
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const sumY = values.reduce((a, v) => a + v, 0);
  const sumXY = values.reduce((a, v, i) => a + i * v, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  return Array.from({ length: steps }, (_, i) =>
    Math.max(0, Math.round(intercept + slope * (n + i)))
  );
}

// ─── route ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await rateLimitByUser(user.id, { windowMs: 60_000, maxRequests: 30 });
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const rangeDays = Math.min(
      Math.max(parseInt(searchParams.get("days") || "30"), 7),
      365
    );

    const now = new Date();
    const rangeStart = startOfDay(subDays(now, rangeDays - 1));
    const prevStart = startOfDay(subDays(rangeStart, rangeDays));

    // ── fetch raw data ──────────────────────────────────────────────────────
    const [generations, usageLogs, dbUser] = await Promise.all([
      prisma.generations.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: prevStart },
        },
        select: {
          id: true,
          outputFormat: true,
          tokensUsed: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.usageLog.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: prevStart },
        },
        select: { creditsConsumed: true, createdAt: true },
      }),
      prisma.users.findUnique({
        where: { id: user.id },
        select: { plan: true, generationsUsed: true, generationsLimit: true },
      }),
    ]);

    // ── split current vs previous period ───────────────────────────────────
    const current = generations.filter((g) => g.createdAt >= rangeStart);
    const previous = generations.filter(
      (g) => g.createdAt >= prevStart && g.createdAt < rangeStart
    );

    const totalCurrent = current.length;
    const totalPrevious = previous.length;

    const changePct =
      totalPrevious > 0
        ? Math.round(((totalCurrent - totalPrevious) / totalPrevious) * 100)
        : totalCurrent > 0
        ? 100
        : 0;

    // ── token usage ────────────────────────────────────────────────────────
    const tokensCurrent = current.reduce((s, g) => s + (g.tokensUsed ?? 0), 0);
    const tokensPrevious = previous.reduce((s, g) => s + (g.tokensUsed ?? 0), 0);
    const tokensChangePct =
      tokensPrevious > 0
        ? Math.round(((tokensCurrent - tokensPrevious) / tokensPrevious) * 100)
        : tokensCurrent > 0
        ? 100
        : 0;

    // ── format breakdown ───────────────────────────────────────────────────
    const formatBreakdown: Record<string, number> = {};
    for (const g of current) {
      if (g.outputFormat) {
        formatBreakdown[g.outputFormat] =
          (formatBreakdown[g.outputFormat] ?? 0) + 1;
      }
    }

    // ── daily series (current range) ────────────────────────────────────────
    const dailyMap = new Map<string, number>();
    for (let i = 0; i < rangeDays; i++) {
      const d = isoDate(subDays(now, rangeDays - 1 - i));
      dailyMap.set(d, 0);
    }
    for (const g of current) {
      const d = isoDate(g.createdAt);
      if (dailyMap.has(d)) dailyMap.set(d, (dailyMap.get(d) ?? 0) + 1);
    }
    const dailySeries = Array.from(dailyMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // ── format trend (daily by format, current period) ─────────────────────
    const formats = ["linkedin_post", "linkedin_carousel", "twitter_thread"];
    const formatDailyMap: Record<string, Map<string, number>> = {};
    for (const fmt of formats) {
      formatDailyMap[fmt] = new Map<string, number>();
      for (let i = 0; i < rangeDays; i++) {
        const d = isoDate(subDays(now, rangeDays - 1 - i));
        formatDailyMap[fmt].set(d, 0);
      }
    }
    for (const g of current) {
      if (!g.outputFormat) continue;
      const d = isoDate(g.createdAt);
      if (formatDailyMap[g.outputFormat]?.has(d)) {
        formatDailyMap[g.outputFormat].set(
          d,
          (formatDailyMap[g.outputFormat].get(d) ?? 0) + 1
        );
      }
    }
    const formatTrend = formats.map((fmt) => ({
      format: fmt,
      series: Array.from(formatDailyMap[fmt].entries()).map(([date, count]) => ({
        date,
        count,
      })),
    }));

    // ── 7-day forecast ────────────────────────────────────────────────────
    const recentValues = dailySeries.slice(-14).map((d) => d.count);
    const forecastValues = linearForecast(recentValues, 7);
    const forecast = forecastValues.map((count, i) => ({
      date: isoDate(
        new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000)
      ),
      count,
    }));

    // ── benchmarks ────────────────────────────────────────────────────────
    const avgCurrent =
      rangeDays > 0 ? Number((totalCurrent / rangeDays).toFixed(2)) : 0;
    const avgPrevious =
      rangeDays > 0 ? Number((totalPrevious / rangeDays).toFixed(2)) : 0;

    // ── credits used in current range ─────────────────────────────────────
    const currentCredits = usageLogs
      .filter((l) => l.createdAt >= rangeStart)
      .reduce((s, l) => s + l.creditsConsumed, 0);

    // ── top performing format ─────────────────────────────────────────────
    const topFormat =
      Object.entries(formatBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      null;

    // ── alerts ────────────────────────────────────────────────────────────
    const alerts: { type: "info" | "warning" | "error"; message: string }[] =
      [];

    if (dbUser) {
      const lim = dbUser.generationsLimit;
      const used = dbUser.generationsUsed;
      if (lim !== -1) {
        const pct = (used / lim) * 100;
        if (pct >= 100) {
          alerts.push({
            type: "error",
            message:
              "You have reached your generation limit for this period.",
          });
        } else if (pct >= 80) {
          alerts.push({
            type: "warning",
            message: `You have used ${Math.round(pct)}% of your generation limit.`,
          });
        }
      }
    }

    if (changePct < -20 && totalPrevious > 0) {
      alerts.push({
        type: "warning",
        message: `Generation volume dropped ${Math.abs(changePct)}% compared to the previous period.`,
      });
    }

    if (totalCurrent === 0 && rangeDays <= 7) {
      alerts.push({
        type: "info",
        message:
          "No content generated yet this week. Head to Generate to get started.",
      });
    }

    return NextResponse.json({
      data: {
        overview: {
          totalGenerations: totalCurrent,
          changePct,
          tokensUsed: tokensCurrent,
          tokensChangePct,
          creditsUsed: currentCredits,
          topFormat,
          avgPerDay: avgCurrent,
          avgPerDayPrevious: avgPrevious,
        },
        formatBreakdown,
        dailySeries,
        formatTrend,
        forecast,
        benchmarks: {
          avgPerDay: avgCurrent,
          avgPerDayPrevious: avgPrevious,
          totalCurrent,
          totalPrevious,
          periodDays: rangeDays,
        },
        alerts,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[analytics/overview]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}