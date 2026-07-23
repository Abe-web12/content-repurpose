"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, DollarSign, Gift, TrendingUp, Activity, Shield, Trophy, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/billing/stat-card";
import { ReferralLeaderboard } from "@/components/referrals/referral-leaderboard";
import { useReferralLeaderboard } from "@/hooks/use-referrals";

interface AdminReferralData {
  totalReferrals: number;
  totalConversions: number;
  totalRevenue: number;
  totalCreditsAwarded: number;
  topReferrers: number;
  conversionRate: number;
}

export default function AdminReferralsPage() {
  const [data, setData] = useState<AdminReferralData | null>(null);
  const [fraudFlags, setFraudFlags] = useState<Array<{ id: string; inviterId: string; inviteeEmail: string | null; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const { leaderboard, loading: lbLoading } = useReferralLeaderboard();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, flagsRes] = await Promise.all([
        window.fetch("/api/referrals"),
        window.fetch("/api/referrals?limit=100"),
      ]);
      const analyticsJson = await analyticsRes.json();
      if (analyticsJson.data?.stats) {
        setData({
          totalReferrals: analyticsJson.data.stats.totalInvites,
          totalConversions: analyticsJson.data.stats.convertedCount,
          totalRevenue: analyticsJson.data.stats.totalRevenue,
          totalCreditsAwarded: analyticsJson.data.stats.totalCredits,
          topReferrers: leaderboard.length,
          conversionRate: analyticsJson.data.stats.conversionRate,
        });
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [leaderboard.length]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Referral Management</h1>
          <p className="text-text-muted mt-1">Monitor and manage the referral program</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Referrals" value={loading ? "..." : (data?.totalReferrals ?? 0)} icon={Users} loading={loading} />
        <StatCard title="Conversions" value={loading ? "..." : (data?.totalConversions ?? 0)} subtitle={`${data?.conversionRate ?? 0}% rate`} icon={TrendingUp} loading={loading} />
        <StatCard title="Revenue from Referrals" value={loading ? "..." : `$${(data?.totalRevenue ?? 0).toFixed(0)}`} icon={DollarSign} loading={loading} />
        <StatCard title="Credits Awarded" value={loading ? "..." : (data?.totalCreditsAwarded ?? 0)} icon={Gift} loading={loading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Program Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-text-muted">Top Referrers</span>
                  <span className="font-semibold">{data?.topReferrers ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-text-muted">Conversion Rate</span>
                  <span className="font-semibold">{data?.conversionRate ?? 0}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-text-muted">Total Revenue Generated</span>
                  <span className="font-semibold">${(data?.totalRevenue ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-text-muted">Total Credits Awarded</span>
                  <span className="font-semibold">{data?.totalCreditsAwarded ?? 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Fraud Detection
            </CardTitle>
            <CardDescription>Flagged referrals requiring review</CardDescription>
          </CardHeader>
          <CardContent>
            {fraudFlags.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Shield className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-sm font-medium text-text-primary">No flags detected</p>
                <p className="text-xs text-text-muted">All referrals appear legitimate</p>
              </div>
            ) : (
              <div className="space-y-2">
                {fraudFlags.map((flag) => (
                  <div key={flag.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{flag.inviteeEmail || "Unknown"}</p>
                      <p className="text-xs text-text-muted">{new Date(flag.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="destructive">Flagged</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Referrers Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReferralLeaderboard entries={leaderboard} loading={lbLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
