"use client";

import { Gift, Share2, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { ReferralLinkCard } from "@/components/referrals/referral-link-card";
import { ReferralStatsCards } from "@/components/referrals/referral-stats-cards";
import { ReferralInvitesTable } from "@/components/referrals/referral-invites-table";
import { ReferralRewardsList } from "@/components/referrals/referral-rewards-list";
import { ReferralLeaderboard } from "@/components/referrals/referral-leaderboard";
import { useReferralCode, useReferralData, useReferralRewards, useReferralLeaderboard } from "@/hooks/use-referrals";

export default function ReferralsPage() {
  const { code, loading: codeLoading } = useReferralCode();
  const { data, loading: dataLoading } = useReferralData();
  const { rewards, loading: rewardsLoading } = useReferralRewards();
  const { leaderboard, loading: leaderboardLoading } = useReferralLeaderboard();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Referrals"
        description="Invite friends and earn rewards"
        action={
          <Button asChild>
            <a href={`mailto:?subject=Join me on RepurposeAI&body=${encodeURIComponent(`Use my referral code: ${code || ""}\n\n${window.location.origin}/signup?ref=${code || ""}`)}`}>
              <Share2 className="h-4 w-4" />
              Invite Friends
            </a>
          </Button>
        }
      />

      <ReferralStatsCards stats={data?.stats ?? null} loading={dataLoading} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <ReferralLinkCard code={code} loading={codeLoading} />

          <Tabs defaultValue="invites">
            <TabsList>
              <TabsTrigger value="invites">
                <Users className="h-4 w-4" />
                Invites
              </TabsTrigger>
              <TabsTrigger value="rewards">
                <Gift className="h-4 w-4" />
                Rewards
              </TabsTrigger>
            </TabsList>
            <TabsContent value="invites" className="mt-4">
              <ReferralInvitesTable events={data?.events ?? []} loading={dataLoading} />
            </TabsContent>
            <TabsContent value="rewards" className="mt-4">
              <ReferralRewardsList rewards={rewards} loading={rewardsLoading} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <ReferralLeaderboard entries={leaderboard} loading={leaderboardLoading} />
          <FunnelCard stats={data?.stats ?? null} loading={dataLoading} />
        </div>
      </div>
    </div>
  );
}

function FunnelCard({ stats, loading }: { stats: any; loading?: boolean }) {
  if (loading || !stats) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Referral Funnel</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-muted rounded animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const maxVal = Math.max(stats.totalInvites, stats.convertedCount, 1);
  const stages = [
    { label: "Invites Sent", value: stats.totalInvites, color: "bg-blue-500" },
    { label: "Signups", value: stats.totalInvites, color: "bg-indigo-500" },
    { label: "Conversions", value: stats.convertedCount, color: "bg-purple-500" },
    { label: "Rewarded", value: stats.pendingRewards, color: "bg-green-500" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Referral Funnel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stages.map((stage) => (
          <div key={stage.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-text-muted">{stage.label}</span>
              <span className="font-semibold">{stage.value}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${stage.color}`}
                style={{ width: `${(stage.value / maxVal) * 100}%` }}
              />
            </div>
          </div>
        ))}
        <div className="pt-2 text-center text-xs text-text-muted">
          {stats.conversionRate}% overall conversion rate
        </div>
      </CardContent>
    </Card>
  );
}
