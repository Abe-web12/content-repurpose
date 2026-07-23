"use client";

import { TrendingUp, Users, CreditCard, DollarSign, ArrowUpRight, Percent, Receipt, Gift, Coins, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/billing/stat-card";
import { useBilling } from "@/hooks/use-billing";

export default function AdminBillingPage() {
  const { revenue, loading } = useBilling();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Admin Billing</h1>
          <p className="mt-1 text-sm text-text-muted">Revenue analytics and billing overview</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Monthly Recurring Revenue" value={loading ? "..." : `$${revenue?.mrr ?? 0}`} icon={TrendingUp} loading={loading} />
        <StatCard title="Annual Run Rate" value={loading ? "..." : `$${revenue?.arr ?? 0}`} icon={DollarSign} loading={loading} />
        <StatCard title="ARPU" value={loading ? "..." : `$${revenue?.arpu ?? 0}`} icon={Users} loading={loading} />
        <StatCard title="Lifetime Value" value={loading ? "..." : `$${revenue?.lifetimeValue ?? 0}`} icon={CreditCard} loading={loading} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Subscriptions" value={loading ? "..." : revenue?.activeSubscriptions ?? 0} icon={Users} loading={loading} />
        <StatCard title="Total Customers" value={loading ? "..." : revenue?.totalCustomers ?? 0} icon={Users} loading={loading} />
        <StatCard title="Churn Rate" value={loading ? "..." : `${revenue?.churnRate ?? 0}%`} icon={Percent} loading={loading} />
        <StatCard title="Credit Revenue" value={loading ? "..." : `$${revenue?.creditRevenue ?? 0}`} icon={Coins} loading={loading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Trends (30 days)</CardTitle>
          <CardDescription>MRR, new customers, and churned customers over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-4 w-20 animate-pulse rounded bg-surface-2" />
                  <div className="h-4 flex-1 animate-pulse rounded bg-surface-2" />
                  <div className="h-4 w-16 animate-pulse rounded bg-surface-2" />
                  <div className="h-4 w-16 animate-pulse rounded bg-surface-2" />
                </div>
              ))}
            </div>
          ) : !revenue?.trends || revenue.trends.length === 0 ? (
            <div className="py-12 text-center">
              <TrendingUp className="mx-auto mb-3 h-10 w-10 text-text-muted opacity-30" />
              <p className="text-sm font-medium text-text-primary">No revenue data yet</p>
              <p className="text-xs text-text-muted">Revenue metrics will appear once subscriptions process.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-2">
                    <th className="pb-3 font-medium text-text-muted">Date</th>
                    <th className="pb-3 font-medium text-text-muted">MRR</th>
                    <th className="pb-3 font-medium text-text-muted">New Customers</th>
                    <th className="pb-3 font-medium text-text-muted">Churned</th>
                    <th className="pb-3 font-medium text-text-muted">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.trends.map((t) => {
                    const growth = t.churnedCount > 0 ? t.newCustomers - t.churnedCount : t.newCustomers;
                    return (
                      <tr key={t.date} className="border-b border-surface-2 last:border-0">
                        <td className="py-3 text-text-primary">{t.date}</td>
                        <td className="py-3 font-medium text-text-primary">${t.mrr.toFixed(0)}</td>
                        <td className="py-3 text-emerald-600">+{t.newCustomers}</td>
                        <td className="py-3 text-red-600">{t.churnedCount > 0 ? `-${t.churnedCount}` : "0"}</td>
                        <td className="py-3">
                          <Badge variant={growth >= 0 ? "success" : "destructive"}>
                            {growth >= 0 ? "+" : ""}{growth}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
