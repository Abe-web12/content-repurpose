"use client";

import { useState } from "react";
import { CreditCard, Coins, TrendingUp, Activity, Users, Zap, ExternalLink, Loader2, ArrowUpRight, AlertTriangle, CheckCircle2, ShoppingCart, Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StatCard } from "@/components/billing/stat-card";
import { UsageCharts } from "@/components/billing/usage-charts";
import { PlanBadge } from "@/components/billing/plan-badge";
import { useBilling, useBillingPortal, useCheckout, useSubscriptionActions } from "@/hooks/use-billing";
import { useUsage } from "@/components/providers/usage-provider";
import { cn } from "@/lib/utils";

export default function BillingPage() {
  const { plan, generationsUsed, generationsLimit } = useUsage();
  const { balance, subscription, revenue, health, packages, addons, invoices, loading } = useBilling();
  const { openPortal, loading: portalLoading } = useBillingPortal();
  const { checkout } = useCheckout();

  const unlimited = generationsLimit === -1;
  const usagePercent = unlimited ? 0 : Math.min(100, Math.round((generationsUsed / generationsLimit) * 100));

  const recentInvoices = invoices.slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Credit Balance"
          value={loading ? "..." : `${balance?.available ?? 0}`}
          subtitle={balance?.reserved ? `${balance.reserved} reserved` : undefined}
          icon={Coins}
          loading={loading}
        />
        <StatCard
          title="Monthly Recurring Revenue"
          value={loading ? "..." : `$${revenue?.mrr ?? 0}`}
          subtitle={`ARR: $${revenue?.arr ?? 0}`}
          icon={TrendingUp}
          loading={loading}
        />
        <StatCard
          title="Health Score"
          value={loading ? "..." : `${health?.healthScore ?? 0}/100`}
          subtitle={`${health?.churnRisk ?? "unknown"} risk`}
          icon={Activity}
          loading={loading}
        />
        <StatCard
          title="Active Subscriptions"
          value={loading ? "..." : `${revenue?.activeSubscriptions ?? 0}`}
          subtitle={`${revenue?.totalCustomers ?? 0} total users`}
          icon={Users}
          loading={loading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-text-muted" />
                  <div>
                    <CardTitle>Current Plan</CardTitle>
                    <CardDescription>Your subscription and usage</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openPortal}
                    disabled={portalLoading}
                    className="gap-2"
                  >
                    {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    {plan === "free" ? "Upgrade" : "Manage"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-surface-2 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">Plan</span>
                    <PlanBadge />
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {subscription?.currentPeriodEnd
                      ? `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                      : "No active subscription"}
                  </p>
                </div>
                <Badge variant={subscription?.status === "ACTIVE" ? "success" : subscription?.status === "PAST_DUE" ? "warning" : "secondary"}>
                  {subscription?.status ?? "FREE"}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">Monthly Usage</span>
                  <span className="text-sm text-text-muted">
                    {unlimited ? "Unlimited" : `${generationsUsed} / ${generationsLimit}`}
                  </span>
                </div>
                {!unlimited && (
                  <Progress
                    value={usagePercent}
                    className="h-2"
                    indicatorClassName={usagePercent >= 100 ? "bg-red-500" : usagePercent >= 80 ? "bg-amber-500" : undefined}
                  />
                )}
              </div>

              {subscription?.cancelAtPeriodEnd && (
                <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-4">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Subscription Cancelled</p>
                    <p className="text-xs text-amber-700">
                      Your subscription will end on {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "the end of this period"}.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-text-muted" />
                <div>
                  <CardTitle>Quick Purchase</CardTitle>
                  <CardDescription>Buy credits or addons</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {packages.slice(0, 3).map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => checkout("subscription", { plan: "starter" })}
                    className="group relative rounded-xl border border-surface-2 p-4 text-left transition-all hover:border-brand-300 hover:shadow-md"
                  >
                    <p className="text-lg font-bold text-text-primary">{pkg.credits}</p>
                    <p className="text-xs text-text-muted">credits</p>
                    <p className="mt-2 text-sm font-semibold text-brand-600">
                      ${(pkg.priceCents / 100).toFixed(2)}
                    </p>
                    <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <UsageCharts trends={revenue?.trends} loading={loading} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-text-muted" />
                <div>
                  <CardTitle>Health Score</CardTitle>
                  <CardDescription>Customer health overview</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {health ? (
                <>
                  <div className="text-center">
                    <div className={cn(
                      "inline-flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold",
                      health.healthScore >= 70 ? "bg-emerald-50 text-emerald-700" :
                      health.healthScore >= 40 ? "bg-amber-50 text-amber-700" :
                      "bg-red-50 text-red-700",
                    )}>
                      {health.healthScore}
                    </div>
                    <p className="mt-2 text-sm font-medium capitalize text-text-primary">{health.churnRisk} Risk</p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Days Active</span>
                      <span className="font-medium text-text-primary">{health.daysActive}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Total Generations</span>
                      <span className="font-medium text-text-primary">{health.totalGenerations}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Billing Status</span>
                      <Badge variant={health.billingStatus === "ok" ? "success" : "warning"} className="text-xs">
                        {health.billingStatus}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Lifetime Value</span>
                      <span className="font-medium text-text-primary">${(health.lifetimeValue ?? 0).toFixed(2)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-sm text-text-muted">
                  <Activity className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  <p>Compute your health score</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Last 5 invoices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentInvoices.length === 0 ? (
                <p className="py-4 text-center text-sm text-text-muted">No invoices yet</p>
              ) : (
                recentInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg bg-surface-1 p-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        ${(inv.amount / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-text-muted">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={inv.status === "PAID" ? "success" : "secondary"} className="text-xs">
                      {inv.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Addons</CardTitle>
              <CardDescription>Enhance your plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {addons.slice(0, 3).map((addon) => (
                <div key={addon.id} className="flex items-center justify-between rounded-lg border border-surface-2 p-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{addon.name}</p>
                    <p className="text-xs text-text-muted">${(addon.priceCents / 100).toFixed(2)}</p>
                  </div>
                  {addon.purchased ? (
                    <Badge variant="success">Owned</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => checkout("addon", { addonId: addon.id })}>
                      Buy
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
