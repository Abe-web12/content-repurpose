import { prisma } from "@/lib/prisma";
import { cacheGet, cacheKey } from "@/lib/utils/cache";
import { subDays, format } from "date-fns";

export interface BenchmarkEntry {
  label: string;
  value: number;
  percentage: number;
  trend: "up" | "down" | "stable";
}

export interface BenchmarkResult {
  metric: string;
  period: string;
  organization: { value: number; percentile: number };
  entries: BenchmarkEntry[];
  average: number;
  median: number;
  topPerformer: number;
}

export class BenchmarkEngine {
  static async compare(organizationId: string, params: {
    metric: string;
    period: string;
    groupBy?: string;
  }): Promise<BenchmarkResult> {
    const { metric, period } = params;
    const cacheKeyStr = cacheKey("benchmarks", organizationId, metric, period);

    return cacheGet<BenchmarkResult>(cacheKeyStr, async () => {
      const days = BenchmarkEngine.parsePeriod(period);
      const startDate = subDays(new Date(), days);

      const orgs = await prisma.organizations.findMany({ select: { id: true } });
      const orgValues: { id: string; value: number }[] = [];

      for (const org of orgs) {
        const value = await BenchmarkEngine.getOrgMetricValue(org.id, metric, startDate);
        orgValues.push({ id: org.id, value });
      }

      orgValues.sort((a, b) => b.value - a.value);

      const orgValue = orgValues.find(o => o.id === organizationId)?.value || 0;
      const totalOrgs = orgValues.length;
      const orgIndex = orgValues.findIndex(o => o.id === organizationId);
      const percentile = totalOrgs > 0 ? Math.round(((totalOrgs - orgIndex - 1) / totalOrgs) * 100) : 50;

      const values = orgValues.map(o => o.value);
      const sorted = [...values].sort((a, b) => a - b);
      const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
      const topPerformer = sorted.length > 0 ? sorted[sorted.length - 1] : 0;

      const entries: BenchmarkEntry[] = orgValues.slice(0, 20).map(o => {
        return {
          label: o.id === organizationId ? "Your Organization" : o.id.slice(0, 8),
          value: Math.round(o.value * 100) / 100,
          percentage: avg > 0 ? Math.round((o.value / avg) * 100) : 0,
          trend: o.value > avg ? "up" : o.value < avg ? "down" : "stable",
        };
      });

      if (orgIndex >= 20) {
        entries.push({
          label: "Your Organization",
          value: Math.round(orgValue * 100) / 100,
          percentage: avg > 0 ? Math.round((orgValue / avg) * 100) : 0,
          trend: orgValue > avg ? "up" : orgValue < avg ? "down" : "stable",
        });
      }

      return {
        metric,
        period,
        organization: { value: Math.round(orgValue * 100) / 100, percentile },
        entries,
        average: Math.round(avg * 100) / 100,
        median: Math.round(median * 100) / 100,
        topPerformer: Math.round(topPerformer * 100) / 100,
      };
    }, 3600);
  }

  private static async getOrgMetricValue(orgId: string, metric: string, since: Date): Promise<number> {
    switch (metric) {
      case "mrr":
      case "arr":
      case "revenue": {
        const r = await prisma.revenueMetrics.findFirst({ orderBy: { date: "desc" } });
        return r ? Number(r.mrr) : 0;
      }
      case "churn": {
        const r = await prisma.revenueMetrics.findFirst({ orderBy: { date: "desc" } });
        if (!r || !r.totalCustomers) return 0;
        return Math.round((r.churnedCount / r.totalCustomers) * 100);
      }
      case "ltv":
      case "cac":
        return 0;
      case "customers":
        return prisma.organizationMembers.count({ where: { organizationId: orgId } });
      case "growth": {
        const prev = await prisma.organizationMembers.count({ where: { organizationId: orgId, joinedAt: { gte: since } } });
        const total = await prisma.organizationMembers.count({ where: { organizationId: orgId } });
        return total > 0 ? Math.round((prev / total) * 100) : 0;
      }
      case "api_usage":
        return prisma.apiRequestLogs.count({ where: { organizationId: orgId, createdAt: { gte: since } } });
      case "ai_usage":
        const ai = await prisma.aiUsageDaily.aggregate({
          where: { organizationId: orgId, date: { gte: since } },
          _sum: { totalRequests: true },
        });
        return ai._sum?.totalRequests || 0;
      case "workflows":
        return prisma.workflowRuns.count({ where: { createdById: orgId, createdAt: { gte: since } } });
      default:
        return 0;
    }
  }

  private static parsePeriod(period: string): number {
    switch (period) {
      case "daily": return 1;
      case "weekly": return 7;
      case "monthly": return 30;
      case "quarterly": return 90;
      case "yearly": return 365;
      default: return 30;
    }
  }
}
