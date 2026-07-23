"use client";

import { Bell, CheckCheck, Info, AlertCircle, CheckCircle } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDistanceToNow } from "date-fns";

const TYPE_ICONS: Record<string, any> = {
  info: Info,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertCircle,
};

const TYPE_COLORS: Record<string, string> = {
  info: "text-brand-600 bg-brand-50",
  success: "text-emerald-600 bg-emerald-50",
  error: "text-red-600 bg-red-50",
  warning: "text-amber-600 bg-amber-50",
};

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-text-muted" />
            <CardTitle>Notifications</CardTitle>
            {unreadCount > 0 && (
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-600">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="gap-2 text-xs">
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-2" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-8 w-8" />}
            title="No notifications"
            description="You'll see updates here when something happens."
          />
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const Icon = TYPE_ICONS[n.type] || Info;
              const colorClass = TYPE_COLORS[n.type] || TYPE_COLORS.info;
              return (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`w-full rounded-lg border border-surface-2 p-4 text-left transition-colors hover:bg-surface-1 ${
                    !n.read ? "border-l-2 border-l-brand-500 bg-brand-50/20" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">{n.title}</p>
                      <p className="text-xs text-text-secondary">{n.message}</p>
                      <p className="mt-1 text-[10px] text-text-muted">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
