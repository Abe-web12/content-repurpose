"use client";

import { TrendingUp, Users, DollarSign } from "lucide-react";
import { useReferralData } from "@/hooks/use-referrals";

export function ReferralConversionWidget() {
  const { data, loading } = useReferralData();

  if (loading || !data?.stats) {
    return (
      <div className="rounded-lg border bg-card p-4 animate-pulse">
        <div className="h-4 w-24 bg-muted rounded mb-3" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-muted rounded" />
          <div className="h-3 w-3/4 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const { stats } = data;
  const conversionRate = stats.conversionRate;

  return (
    <div className="rounded-lg border bg-card p-4">
      <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-3">Referral Conversion</h4>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Invites
          </span>
          <span className="text-sm font-semibold">{stats.totalInvites}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Conversions
          </span>
          <span className="text-sm font-semibold">{stats.convertedCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            Rate
          </span>
          <span className="text-sm font-semibold">{conversionRate}%</span>
        </div>
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${Math.min(conversionRate, 100)}%` }} />
        </div>
      </div>
    </div>
  );
}
