"use client";

import { useState } from "react";
import {
  Calendar, ChevronLeft, ChevronRight, Clock, CheckCircle2,
  XCircle, RefreshCw, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { showSuccess, showError } from "@/components/ui/toast";

interface ScheduledPost {
  id: string;
  platform: string;
  content: string;
  scheduled_at: string;
  status: "PENDING" | "PUBLISHED" | "FAILED";
}

interface CalendarViewProps {
  posts: ScheduledPost[];
  loading?: boolean;
  onRefresh?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  PUBLISHED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_ICONS: Record<string, any> = {
  PENDING: Clock,
  PUBLISHED: CheckCircle2,
  FAILED: XCircle,
};

export function CalendarView({ posts, loading, onRefresh }: CalendarViewProps) {
  const [retrying, setRetrying] = useState<string | null>(null);

  const handleRetry = async (id: string) => {
    setRetrying(id);
    try {
      const res = await fetch(`/api/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "retry" }),
      });
      if (res.ok) {
        showSuccess("Retrying post...");
        onRefresh?.();
      } else {
        showError("Failed to retry");
      }
    } catch {
      showError("Network error");
    } finally {
      setRetrying(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-surface-2" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={<Calendar className="h-10 w-10" />}
            title="No scheduled posts"
            description="Schedule your first post from the generate screen."
            action={
              <Button asChild>
                <a href="/generate">Create a post</a>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const sorted = [...posts].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );

  const grouped: Record<string, ScheduledPost[]> = {};
  sorted.forEach((post) => {
    const date = new Date(post.scheduled_at).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(post);
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-text-muted" />
            <CardTitle>Schedule</CardTitle>
          </div>
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, datePosts]) => (
            <div key={date}>
              <h4 className="mb-3 text-sm font-semibold text-text-primary">{date}</h4>
              <div className="space-y-2">
                {datePosts.map((post) => {
                  const StatusIcon = STATUS_ICONS[post.status];
                  const statusColor = STATUS_COLORS[post.status];
                  return (
                    <div
                      key={post.id}
                      className="flex items-center gap-4 rounded-lg border border-surface-2 p-4"
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${statusColor}`}>
                        <StatusIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {post.content.slice(0, 100)}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-text-muted capitalize">
                            {post.platform}
                          </span>
                          <Badge variant="outline" className={statusColor}>
                            {post.status}
                          </Badge>
                          <span className="text-xs text-text-muted">
                            {new Date(post.scheduled_at).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                      {post.status === "FAILED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(post.id)}
                          disabled={retrying === post.id}
                          className="gap-2"
                        >
                          {retrying === post.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Retry
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
