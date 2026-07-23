"use client";

import { Mail, Clock, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ReferralInvite {
  id: string;
  inviteeEmail: string | null;
  eventType: string;
  status: string;
  createdAt: string;
}

interface ReferralInvitesTableProps {
  events: ReferralInvite[];
  loading?: boolean;
}

const statusConfig: Record<string, { label: string; icon: any; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING: { label: "Pending", icon: Clock, variant: "outline" },
  CONVERTED: { label: "Converted", icon: CheckCircle2, variant: "default" },
  REWARDED: { label: "Rewarded", icon: CheckCircle2, variant: "default" },
  EXPIRED: { label: "Expired", icon: XCircle, variant: "secondary" },
  FLAGGED: { label: "Flagged", icon: AlertTriangle, variant: "destructive" },
};

function InviteRow({ event }: { event: ReferralInvite }) {
  const config = statusConfig[event.status] || statusConfig.PENDING;
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-muted p-2">
          <Mail className="h-4 w-4 text-text-muted" />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">
            {event.inviteeEmail || "Unknown"}
          </p>
          <p className="text-xs text-text-muted">
            {new Date(event.createdAt).toLocaleDateString()} &middot; {event.eventType}
          </p>
        </div>
      </div>
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    </div>
  );
}

export function ReferralInvitesTable({ events, loading }: ReferralInvitesTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Invite History</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-40 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Invite History
          <span className="ml-2 text-sm font-normal text-text-muted">({events.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Mail className="h-8 w-8 text-text-muted mb-2" />
            <p className="text-sm text-text-muted">No invites yet. Share your referral link to get started!</p>
          </div>
        ) : (
          events.map((event) => <InviteRow key={event.id} event={event} />)
        )}
      </CardContent>
    </Card>
  );
}
