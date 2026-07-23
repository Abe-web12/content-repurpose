"use client";

import Link from "next/link";
import { Sparkles, Clock, TrendingUp, Zap, ArrowRight, BarChart3, Calendar, Rocket } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUsage } from "@/components/providers/usage-provider";
import { Progress } from "@/components/ui/progress";
import { PLANS } from "@/lib/constants/plans";
import { useGenerations } from "@/hooks/use-generations";
import { GenerationCard } from "@/components/history/generation-card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsWidget } from "@/components/dashboard/AnalyticsWidget";
import { ScheduleWidget } from "@/components/dashboard/ScheduleWidget";
import { QuickActions } from "@/components/shared/quick-actions";
import { ReferralEarningsWidget } from "@/components/dashboard/widgets/referral-earnings-widget";
import { ReferralConversionWidget } from "@/components/dashboard/widgets/referral-conversion-widget";

function DashboardSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-slate-200/60" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}><Skeleton className="h-3 w-20 mb-1" /><Skeleton className="h-7 w-16" /></div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-5 w-20" /></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px] rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <section>
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  const { plan, generationsUsed, generationsLimit, remaining, percentage, canUserGenerate } =
    useUsage();
  const { generations, loading, refresh } = useGenerations({ limit: 5, subscribe: true });

  const unlimited = generationsLimit === -1;
  const planData = PLANS[plan];

  async function handleToggleFavorite() {
    refresh();
  }

  if (loading && generations.length === 0) {
    return (
      <div className="space-y-10">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Dashboard"
        description="Your content generation overview."
        action={
          <Button asChild>
            <Link href="/generate">
              <Sparkles className="h-4 w-4" />
              Generate content
            </Link>
          </Button>
        }
      />

      <QuickActions />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <Zap className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize text-text-primary">{plan}</div>
            <p className="text-xs text-text-muted">
              {planData?.name || "Free"} plan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Generations Used</CardTitle>
            <TrendingUp className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text-primary">
              {unlimited ? "Unlimited" : `${generationsUsed} / ${generationsLimit}`}
            </div>
            <Progress
              value={unlimited ? 0 : percentage}
              className="mt-2 h-1.5"
              indicatorClassName={
                !canUserGenerate ? "bg-red-500" : percentage > 80 ? "bg-amber-500" : undefined
              }
            />
            {!unlimited && (
              <p className="mt-1 text-xs text-text-muted">
                {remaining} generation{remaining !== 1 ? "s" : ""} remaining
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Clock className="h-4 w-4 text-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text-primary">{generations.length}</div>
            <p className="text-xs text-text-muted">Recent generations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Quick Action</CardTitle>
            <Sparkles className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/generate">
                New generation
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            {!canUserGenerate && (
              <p className="mt-2 text-xs text-center text-amber-600">
                Limit reached. <Link href="/upgrade" className="underline">Upgrade</Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsWidget />
        <ScheduleWidget />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <ReferralEarningsWidget />
        <ReferralConversionWidget />
      </div>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-text-primary">Recent Generations</h3>
          <Button variant="outline" size="sm" asChild>
            <Link href="/history">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : generations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-text-secondary">No generations yet.</p>
              <Button variant="link" asChild>
                <Link href="/generate">Create your first generation</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {generations.map((gen) => (
              <GenerationCard
                key={gen.id}
                generation={gen}
                onToggleFavorite={handleToggleFavorite}
                onDelete={refresh}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
