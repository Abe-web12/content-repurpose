"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Calendar,
  Linkedin,
  Twitter,
  Globe,
  FileText,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  Trash2,
  Send,
  type LucideIcon,
} from "lucide-react";
import type { ScheduledPost, ScheduledPostStatus, ScheduledPlatform } from "@/lib/types/index";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeUp, Stagger } from "@/components/shared/motion";
import { cn } from "@/lib/utils";
import { showSuccess, showError } from "@/components/ui/toast";

const platformIcons: Record<ScheduledPlatform, LucideIcon> = {
  linkedin: Linkedin,
  twitter: Twitter,
  blog: Globe,
  other: FileText,
};

const platformLabels: Record<ScheduledPlatform, string> = {
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  blog: "Blog",
  other: "Other",
};

const statusStyles: Record<ScheduledPostStatus, string> = {
  draft: "bg-surface-2 text-text-secondary border-surface-3",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  posted: "bg-green-50 text-green-700 border-green-200",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  const formatted = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });

  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (days < 0) return `${formatted} ${time}`;
  if (days === 0) return `Today at ${time}`;
  if (days === 1) return `Tomorrow at ${time}`;
  if (days < 7) return `${formatted} at ${time}`;
  return `${formatted} at ${time}`;
}

function getContentPreview(content: string, max = 120): string {
  return content.length > max ? content.slice(0, max) + "..." : content;
}

export function ScheduleWidget() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const fetchRef = useRef<((status?: string) => Promise<void>) | null>(null);

  const fetchPosts = useCallback(async (status?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      params.set("limit", "20");
      const res = await fetch(`/api/schedule?${params}`);
      const json = await res.json();
      if (res.ok) setPosts(json.data || []);
      else showError(json.error || "Failed to load");
    } catch {
      showError("Network error loading scheduled posts");
    } finally {
      setLoading(false);
    }
  }, []);

  fetchRef.current = fetchPosts;

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchRef.current?.();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = useCallback(async (id: string, status: ScheduledPostStatus) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (res.ok) {
        setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
        showSuccess(status === "posted" ? "Marked as posted" : status === "scheduled" ? "Scheduled" : "Reverted to draft");
      } else {
        showError(json.error || "Failed to update");
      }
    } catch {
      showError("Network error");
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/schedule?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
        showSuccess("Post deleted");
      } else {
        const json = await res.json();
        showError(json.error || "Failed to delete");
      }
    } catch {
      showError("Network error");
    } finally {
      setActionLoading(null);
    }
  }, []);

  const upcoming = posts.filter((p) => p.status !== "posted");
  const posted = posts.filter((p) => p.status === "posted");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Calendar className="h-4 w-4 text-brand-600" />
          Schedule
        </CardTitle>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchPosts()}
            className="text-xs text-text-muted"
            aria-label="Show all scheduled posts"
          >
            All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchPosts("scheduled")}
            className="text-xs text-text-muted"
            aria-label="Show only scheduled posts"
          >
            Scheduled
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] rounded-lg" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="space-y-5 py-4">
            <div className="space-y-3">
              {[{ icon: Linkedin, label: "LinkedIn" }, { icon: Twitter, label: "Twitter / X" }, { icon: Globe, label: "Blog" }].map((item, i) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 rounded-lg border border-dashed border-surface-3/60 bg-white/50 p-3"
                  style={{ opacity: 1 - i * 0.15 }}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-surface-3 bg-surface-1/50">
                    <item.icon className="h-4 w-4 text-text-muted/40" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-muted/40">{item.label}</span>
                      <span className="rounded-full border border-dashed border-surface-3/40 px-2 py-0.5 text-[10px] font-medium text-text-muted/30">draft</span>
                    </div>
                    <div className="h-3 w-full rounded border border-dashed border-surface-3/30 bg-transparent" />
                    <div className="h-3 w-3/4 rounded border border-dashed border-surface-3/30 bg-transparent" />
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded border border-dashed border-surface-3/40" />
                      <div className="h-2 w-16 rounded border border-dashed border-surface-3/40 bg-transparent" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-text-primary">
                Your Content Queue is Empty. <span className="whitespace-nowrap">📅</span>
              </p>
              <p className="mt-1 text-xs text-text-muted max-w-xs mx-auto leading-relaxed">
                Plan, schedule, and automate your multi-channel posts in advance to keep your brand active 24/7.
              </p>
              <Link
                href="/generate"
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#6366F1]/20 px-5 py-2.5 text-sm font-semibold text-[#6366F1] transition-all duration-200 hover:bg-[#6366F1]/10"
              >
                Schedule a Post Now
                <span>📅</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Stagger as="ul" className="space-y-2">
              {upcoming.slice(0, 5).map((post) => {
                const Icon = platformIcons[post.platform];
                return (
                  <FadeUp key={post.id} as="li">
                    <div className="group flex items-start gap-3 rounded-lg border border-surface-3 bg-white p-3 transition-all hover:border-surface-4 hover:shadow-sm">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-1">
                        <Icon className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-text-primary">
                            {platformLabels[post.platform]}
                          </span>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                              statusStyles[post.status]
                            )}
                          >
                            {post.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-text-muted line-clamp-2">
                          {getContentPreview(post.content)}
                        </p>
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-text-muted">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {formatDate(post.scheduled_at)}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                            loading={actionLoading === post.id}
                            aria-label={`Actions for ${platformLabels[post.platform]} post`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {post.status === "draft" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(post.id, "scheduled")}>
                              <Clock className="h-3.5 w-3.5" />
                              Mark scheduled
                            </DropdownMenuItem>
                          )}
                          {post.status !== "posted" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(post.id, "posted")}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Mark posted
                            </DropdownMenuItem>
                          )}
                          {post.status === "scheduled" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(post.id, "draft")}>
                              <Send className="h-3.5 w-3.5" />
                              Revert to draft
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDelete(post.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </FadeUp>
                );
              })}
            </Stagger>
            {posted.length > 0 && (
              <details className="group mt-3">
                <summary className="cursor-pointer text-xs font-medium text-text-muted hover:text-text-secondary transition-colors">
                  Posted ({posted.length})
                </summary>
                <div className="mt-2 space-y-2">
                  {posted.slice(0, 3).map((post) => {
                    const Icon = platformIcons[post.platform];
                    return (
                      <div
                        key={post.id}
                        className="flex items-start gap-3 rounded-lg border border-surface-3 p-3 opacity-60"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-1">
                          <Icon className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-text-primary">
                              {platformLabels[post.platform]}
                            </span>
                            <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                              posted
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-text-muted line-clamp-1">
                            {getContentPreview(post.content, 80)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-text-muted">
                            {formatDate(post.scheduled_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
