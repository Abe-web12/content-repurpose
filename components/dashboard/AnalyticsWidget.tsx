"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  BarChart3,
  Linkedin,
  Twitter,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { FadeUp, Stagger } from "@/components/shared/motion";
import { cn } from "@/lib/utils";
import type { OutputFormat } from "@/lib/constants/formats";

interface AnalyticsData {
  totalGenerations: number;
  formatBreakdown: Record<OutputFormat, number>;
  estimatedReach: string;
  engagementRate: string;
  topFormat: string | null;
}

const formatIcons: Record<string, typeof Linkedin> = {
  linkedin_post: Linkedin,
  linkedin_carousel: Layers,
  twitter_thread: Twitter,
};

const formatColors: Record<string, string> = {
  linkedin_post: "text-blue-600 bg-blue-50",
  linkedin_carousel: "text-purple-600 bg-purple-50",
  twitter_thread: "text-sky-500 bg-sky-50",
};

const formatLabels: Record<string, string> = {
  linkedin_post: "LinkedIn Post",
  linkedin_carousel: "Carousel",
  twitter_thread: "X Thread",
};

const ESTIMATED_REACH_PER_POST = 1250;
const ESTIMATED_ENGAGEMENT_RATE = 3.8;

export function AnalyticsWidget() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef<() => Promise<void> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/generations?limit=100");
      const json = await res.json();
      const generations: { output_format: OutputFormat }[] = json.data || [];

      const total = generations.length;
      const breakdown: Record<OutputFormat, number> = {
        linkedin_post: 0,
        linkedin_carousel: 0,
        twitter_thread: 0,
      };

      for (const gen of generations) {
        if (breakdown[gen.output_format] !== undefined) {
          breakdown[gen.output_format]++;
        }
      }

      const formatEntries = Object.entries(breakdown) as [OutputFormat, number][];
      const topFormat = formatEntries.sort((a, b) => b[1] - a[1])[0];

      setData({
        totalGenerations: total,
        formatBreakdown: breakdown,
        estimatedReach: total > 0 ? `${(total * ESTIMATED_REACH_PER_POST).toLocaleString()}` : "0",
        engagementRate: total > 0 ? `${ESTIMATED_ENGAGEMENT_RATE}%` : "0%",
        topFormat: topFormat && topFormat[1] > 0 ? topFormat[0] : null,
      });
    } catch {
      setData({
        totalGenerations: 0,
        formatBreakdown: { linkedin_post: 0, linkedin_carousel: 0, twitter_thread: 0 },
        estimatedReach: "0",
        engagementRate: "0%",
        topFormat: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  fetchRef.current = fetchData;

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchRef.current?.();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatEntries = useMemo(
    () => (data ? Object.entries(data.formatBreakdown) as [OutputFormat, number][] : []),
    [data?.formatBreakdown]
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-brand-600" />
            Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-7 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <FadeUp as="div">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-brand-600" />
            Analytics
          </CardTitle>
          {data.totalGenerations > 0 && (
            <span className="text-[10px] text-text-muted">
              Estimated metrics
            </span>
          )}
        </CardHeader>
        <CardContent>
          {data.totalGenerations === 0 ? (
            <div className="relative overflow-hidden rounded-xl py-10">
              <div className="pointer-events-none absolute inset-0 select-none opacity-20">
                <svg viewBox="0 0 400 200" className="h-full w-full" aria-hidden="true">
                  <defs>
                    <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366F1" />
                      <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                    <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                    </linearGradient>
                    <filter id="glow"><feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                  </defs>
                  <path d="M0 160 Q20 155 40 140 Q60 125 80 130 Q100 135 120 110 Q140 85 160 90 Q180 95 200 70 Q220 45 240 50 Q260 55 280 35 Q300 15 320 20 Q340 25 360 15 Q380 5 400 10" fill="none" stroke="url(#line-grad)" strokeWidth="2.5" filter="url(#glow)" />
                  <path d="M0 160 Q20 155 40 140 Q60 125 80 130 Q100 135 120 110 Q140 85 160 90 Q180 95 200 70 Q220 45 240 50 Q260 55 280 35 Q300 15 320 20 Q340 25 360 15 Q380 5 400 10 L400 200 L0 200 Z" fill="url(#area-grad)" opacity="0.6" />
                  <circle cx="100" cy="135" r="3" fill="#A5B4FC" opacity="0.5" />
                  <circle cx="160" cy="90" r="3" fill="#A5B4FC" opacity="0.5" />
                  <circle cx="220" cy="50" r="3" fill="#A5B4FC" opacity="0.5" />
                  <circle cx="300" cy="20" r="3" fill="#A5B4FC" opacity="0.5" />
                  <rect x="50" y="130" width="8" height="40" rx="2" fill="#A5B4FC" opacity="0.25" />
                  <rect x="100" y="110" width="8" height="60" rx="2" fill="#A5B4FC" opacity="0.25" />
                  <rect x="150" y="80" width="8" height="90" rx="2" fill="#A5B4FC" opacity="0.25" />
                  <rect x="200" y="50" width="8" height="120" rx="2" fill="#A5B4FC" opacity="0.25" />
                  <rect x="250" y="70" width="8" height="100" rx="2" fill="#A5B4FC" opacity="0.25" />
                  <rect x="300" y="30" width="8" height="140" rx="2" fill="#A5B4FC" opacity="0.25" />
                  <rect x="350" y="60" width="8" height="110" rx="2" fill="#A5B4FC" opacity="0.25" />
                </svg>
              </div>
              <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">
                <h3 className="text-base font-semibold text-text-primary">
                  Your AI Content Engine is Ready!
                </h3>
                <p className="mt-2 max-w-md text-sm text-text-muted leading-relaxed">
                  Generate your first high-converting post to unlock deep engagement graphs, real-time analytics, and automated audience reach metrics here.
                </p>
                <Link
                  href="/generate"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#6366F1] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:bg-[#5051F1] hover:shadow-indigo-500/40 active:scale-[0.97]"
                >
                  Generate Content Now
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </Link>
              </div>
            </div>
          ) : (
            <Stagger className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-muted">Total Posts</p>
                  <p className="text-2xl font-bold text-text-primary">{data.totalGenerations}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Est. Reach</p>
                  <p className="text-2xl font-bold text-text-primary">{data.estimatedReach}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Engagement Rate</p>
                  <p className="text-2xl font-bold text-green-600">{data.engagementRate}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Top Format</p>
                  <p className="text-lg font-semibold text-text-primary">
                    {data.topFormat ? formatLabels[data.topFormat] || "—" : "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-2" role="region" aria-label="Content format breakdown">
                <p className="text-xs font-medium text-text-muted">By format</p>
                {formatEntries.map(([format, count]) => {
                  const maxCount = Math.max(...formatEntries.map(([, c]) => c), 1);
                  const pct = Math.round((count / maxCount) * 100);
                  const Icon = formatIcons[format] || Linkedin;
                  return (
                    <div key={format} className="flex items-center gap-3">
                      <div className={cn("flex h-7 w-7 items-center justify-center rounded-full", formatColors[format])}>
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-text-primary">
                            {formatLabels[format] || format}
                          </span>
                          <span className="text-xs text-text-muted">{count}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                          <div
                            className="h-full rounded-full bg-brand-600 transition-all duration-500 ease-out"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Stagger>
          )}
        </CardContent>
      </Card>
    </FadeUp>
  );
}
