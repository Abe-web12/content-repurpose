"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Users, Activity, Cpu, Database, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  change?: number;
  direction?: "up" | "down" | "stable";
}

function KpiCard({ label, value, icon, change, direction }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text-secondary">{label}</span>
          <span className="text-text-muted">{icon}</span>
        </div>
        <div className="text-2xl font-bold text-text-primary">{value}</div>
        {direction && change !== undefined && (
          <div className={cn("flex items-center gap-1 mt-1 text-xs", direction === "up" ? "text-green-600" : direction === "down" ? "text-red-600" : "text-text-muted")}>
            {direction === "up" ? <TrendingUp className="w-3 h-3" /> : direction === "down" ? <TrendingDown className="w-3 h-3" /> : null}
            {change}% vs last period
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ExecutiveKpiCardsProps {
  metrics: {
    mrr: number;
    arr: number;
    netRevenue: number;
    grossRevenue: number;
    activeCustomers: number;
    newCustomers: number;
    churnRate: number;
    expansionRevenue: number;
    ltv: number;
    cac: number;
    paybackPeriod: number;
    activeOrganizations: number;
    apiUsage: number;
    aiUsage: number;
    creditConsumption: number;
    storageUsage: number;
    workflowExecutions: number;
    marketplaceInstalls: number;
  } | null;
}

export function ExecutiveKpiCards({ metrics }: ExecutiveKpiCardsProps) {
  if (!metrics) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard label="MRR" value={`$${metrics.mrr.toLocaleString()}`} icon={<DollarSign className="w-4 h-4" />} />
      <KpiCard label="ARR" value={`$${metrics.arr.toLocaleString()}`} icon={<DollarSign className="w-4 h-4" />} />
      <KpiCard label="Net Revenue" value={`$${metrics.netRevenue.toLocaleString()}`} icon={<DollarSign className="w-4 h-4" />} />
      <KpiCard label="Gross Revenue" value={`$${metrics.grossRevenue.toLocaleString()}`} icon={<DollarSign className="w-4 h-4" />} />
      <KpiCard label="Active Customers" value={metrics.activeCustomers.toLocaleString()} icon={<Users className="w-4 h-4" />} />
      <KpiCard label="New Customers" value={metrics.newCustomers.toLocaleString()} icon={<Users className="w-4 h-4" />} />
      <KpiCard label="Churn" value={`${metrics.churnRate}%`} icon={<Users className="w-4 h-4" />} direction="up" change={metrics.churnRate} />
      <KpiCard label="Expansion Rev" value={`$${metrics.expansionRevenue.toLocaleString()}`} icon={<TrendingUp className="w-4 h-4" />} />
      <KpiCard label="LTV" value={`$${metrics.ltv.toLocaleString()}`} icon={<DollarSign className="w-4 h-4" />} />
      <KpiCard label="CAC" value={`$${metrics.cac.toLocaleString()}`} icon={<DollarSign className="w-4 h-4" />} />
      <KpiCard label="Payback (mo)" value={metrics.paybackPeriod.toLocaleString()} icon={<Activity className="w-4 h-4" />} />
      <KpiCard label="Active Orgs" value={metrics.activeOrganizations.toLocaleString()} icon={<Users className="w-4 h-4" />} />
      <KpiCard label="API Usage" value={metrics.apiUsage.toLocaleString()} icon={<Zap className="w-4 h-4" />} />
      <KpiCard label="AI Usage" value={metrics.aiUsage.toLocaleString()} icon={<Cpu className="w-4 h-4" />} />
      <KpiCard label="Credits Used" value={metrics.creditConsumption.toLocaleString()} icon={<Zap className="w-4 h-4" />} />
      <KpiCard label="Storage (MB)" value={metrics.storageUsage.toLocaleString()} icon={<Database className="w-4 h-4" />} />
      <KpiCard label="Workflow Execs" value={metrics.workflowExecutions.toLocaleString()} icon={<Activity className="w-4 h-4" />} />
      <KpiCard label="Marketplace Installs" value={metrics.marketplaceInstalls.toLocaleString()} icon={<Database className="w-4 h-4" />} />
    </div>
  );
}
