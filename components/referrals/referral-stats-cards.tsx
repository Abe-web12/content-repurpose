"use client";

import { Users, TrendingUp, Gift, DollarSign } from "lucide-react";
import { StatCard } from "@/components/billing/stat-card";

interface ReferralStatsCardsProps {
  stats: {
    totalInvites: number;
    convertedCount: number;
    totalCredits: number;
    totalRevenue: number;
    pendingRewards: number;
    conversionRate: number;
  } | null;
  loading?: boolean;
}

export function ReferralStatsCards({ stats, loading }: ReferralStatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Invites"
        value={loading ? "..." : (stats?.totalInvites ?? 0)}
        subtitle="People you've invited"
        icon={Users}
        loading={loading}
      />
      <StatCard
        title="Conversions"
        value={loading ? "..." : (stats?.convertedCount ?? 0)}
        subtitle={`${stats?.conversionRate ?? 0}% conversion rate`}
        icon={TrendingUp}
        loading={loading}
      />
      <StatCard
        title="Credits Earned"
        value={loading ? "..." : (stats?.totalCredits ?? 0)}
        subtitle={`${stats?.pendingRewards ?? 0} pending rewards`}
        icon={Gift}
        loading={loading}
      />
      <StatCard
        title="Revenue Earned"
        value={loading ? "..." : `$${(stats?.totalRevenue ?? 0).toFixed(0)}`}
        subtitle="From referrals"
        icon={DollarSign}
        loading={loading}
      />
    </div>
  );
}
