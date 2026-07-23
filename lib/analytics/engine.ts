import { prisma } from "@/lib/prisma";
import { cacheGet, cacheKey } from "@/lib/utils/cache";
import { subDays, startOfDay, format } from "date-fns";


export interface ExecutiveMetrics {
  mrr: number;
  arr: number;
  netRevenue: number;
  grossRevenue: number;
  activeCustomers: number;
  newCustomers: number;
  churnRate: number;
  expansionRevenue: number;
  contractionRevenue: number;
  ltv: number;
  cac: number;
  paybackPeriod: number;
  activeOrganizations: number;
  apiUsage: number;
  aiUsage: number;
  creditConsumption: number;
  storageUsage: number;
  workflowExecutions: number;
  aiProviderUsage: Record<string, number>;
  marketplaceInstalls: number;
  previousPeriod?: Partial<ExecutiveMetrics>;
  trends?: Record<string, { value: number; change: number; direction: "up" | "down" | "stable" }>;
}

export interface RevenueDataPoint {
  date: string;
  mrr: number;
  arr: number;
  grossRevenue: number;
  netRevenue: number;
  expansionRevenue: number;
  contractionRevenue: number;
}

export interface CustomerDataPoint {
  date: string;
  activeCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
  totalCustomers: number;
  ltv: number;
  cac: number;
}

export interface AIDataPoint {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
  latency: number;
  successRate: number;
}

export interface WorkflowDataPoint {
  date: string;
  runs: number;
  successCount: number;
  failedCount: number;
  avgDuration: number;
}

export interface PerformanceMetrics {
  apiLatency: number;
  dbQueries: number;
  cacheHitRatio: number;
  queueProcessing: number;
  backgroundJobs: number;
  searchPerformance: number;
  uploadPerformance: number;
  responseTime: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface CustomerSegment {
  name: string;
  count: number;
  percentage: number;
  revenue: number;
  description: string;
}

export interface CohortData {
  period: string;
  customers: number;
  periods: { index: number; retention: number; revenue: number }[];
}

export class AnalyticsEngine {
  static async getExecutiveMetrics(organizationId: string): Promise<ExecutiveMetrics> {
    const cacheKeyStr = cacheKey("analytics", "executive", organizationId, format(new Date(), "yyyy-MM-dd"));

    return cacheGet<ExecutiveMetrics>(cacheKeyStr, async () => {
      const now = new Date();
      const todayStart = startOfDay(now);
      const thirtyDaysAgo = subDays(now, 30);
      const sixtyDaysAgo = subDays(now, 60);

      const [currentRevenue, prevRevenue, customerData, orgData, apiData, aiData, creditData, storageData, workflowData, providerData, marketplaceData] = await Promise.all([
        AnalyticsEngine.getRevenueMetrics(thirtyDaysAgo, now),
        AnalyticsEngine.getRevenueMetrics(sixtyDaysAgo, thirtyDaysAgo),
        AnalyticsEngine.getCustomerMetrics(thirtyDaysAgo, now),
        prisma.organizations.count(),
        AnalyticsEngine.getTotalApiUsage(organizationId, todayStart),
        AnalyticsEngine.getTotalAiUsage(organizationId, thirtyDaysAgo, now),
        AnalyticsEngine.getTotalCredits(organizationId, thirtyDaysAgo, now),
        AnalyticsEngine.getStorageUsage(organizationId),
        AnalyticsEngine.getTotalWorkflowExecutions(organizationId, thirtyDaysAgo, now),
        AnalyticsEngine.getProviderUsage(organizationId, thirtyDaysAgo, now),
        AnalyticsEngine.getMarketplaceInstalls(organizationId),
      ]);

      const metrics: ExecutiveMetrics = {
        mrr: currentRevenue.mrr,
        arr: currentRevenue.mrr * 12,
        netRevenue: currentRevenue.mrr,
        grossRevenue: currentRevenue.mrr,
        activeCustomers: customerData.activeCustomers,
        newCustomers: customerData.newCustomers,
        churnRate: customerData.churnRate,
        expansionRevenue: currentRevenue.expansionRevenue,
        contractionRevenue: currentRevenue.contractionRevenue,
        ltv: customerData.ltv,
        cac: customerData.cac,
        paybackPeriod: customerData.cac > 0 ? Math.round(customerData.ltv / customerData.cac) : 0,
        activeOrganizations: orgData,
        apiUsage: apiData,
        aiUsage: aiData.totalRequests,
        creditConsumption: creditData,
        storageUsage: storageData,
        workflowExecutions: workflowData,
        aiProviderUsage: providerData,
        marketplaceInstalls: marketplaceData,
      };

      const prevMetrics = {
        mrr: prevRevenue.mrr,
        arr: prevRevenue.mrr * 12,
        netRevenue: prevRevenue.mrr,
        grossRevenue: prevRevenue.mrr,
      };

      metrics.previousPeriod = prevMetrics;
      metrics.trends = AnalyticsEngine.computeTrends({ mrr: metrics.mrr, arr: metrics.arr, netRevenue: metrics.mrr, grossRevenue: metrics.mrr }, prevMetrics);

      return metrics;
    }, 300);
  }

  static async getRevenueData(organizationId: string, days: number): Promise<RevenueDataPoint[]> {
    const cacheKeyStr = cacheKey("analytics", "revenue", organizationId, `${days}`);

    return cacheGet<RevenueDataPoint[]>(cacheKeyStr, async () => {
      const startDate = subDays(new Date(), days);

      const records = await prisma.revenueMetrics.findMany({
        where: { date: { gte: startDate } },
        orderBy: { date: "asc" },
      });

      const dataMap = new Map<string, RevenueDataPoint>();
      for (const r of records) {
        dataMap.set(format(r.date, "yyyy-MM-dd"), {
          date: format(r.date, "yyyy-MM-dd"),
          mrr: Number(r.mrr) || 0,
          arr: Number(r.arr) || 0,
          grossRevenue: Number(r.mrr) || 0,
          netRevenue: Number(r.mrr) || 0,
          expansionRevenue: Number(r.expansionMrr) || 0,
          contractionRevenue: Number(r.churnMrr) || 0,
        });
      }

      const result: RevenueDataPoint[] = [];
      for (let i = days; i >= 0; i--) {
        const date = format(subDays(new Date(), i), "yyyy-MM-dd");
        result.push(dataMap.get(date) || {
          date, mrr: 0, arr: 0, grossRevenue: 0, netRevenue: 0, expansionRevenue: 0, contractionRevenue: 0,
        });
      }

      return result;
    }, 300);
  }

  static async getCustomerData(organizationId: string, days: number): Promise<CustomerDataPoint[]> {
    const cacheKeyStr = cacheKey("analytics", "customers", organizationId, `${days}`);

    return cacheGet<CustomerDataPoint[]>(cacheKeyStr, async () => {
      const startDate = subDays(new Date(), days);

      const records = await prisma.revenueMetrics.findMany({
        where: { date: { gte: startDate } },
        orderBy: { date: "asc" },
      });

      const dataMap = new Map<string, CustomerDataPoint>();
      for (const r of records) {
        dataMap.set(format(r.date, "yyyy-MM-dd"), {
          date: format(r.date, "yyyy-MM-dd"),
          activeCustomers: r.activeSubscriptions || 0,
          newCustomers: r.newCustomers || 0,
          churnedCustomers: r.churnedCount || 0,
          totalCustomers: r.totalCustomers || 0,
          ltv: 0,
          cac: 0,
        });
      }

      const result: CustomerDataPoint[] = [];
      for (let i = days; i >= 0; i--) {
        const date = format(subDays(new Date(), i), "yyyy-MM-dd");
        result.push(dataMap.get(date) || {
          date, activeCustomers: 0, newCustomers: 0, churnedCustomers: 0, totalCustomers: 0, ltv: 0, cac: 0,
        });
      }

      return result;
    }, 300);
  }

  static async getCustomerSegments(organizationId: string): Promise<CustomerSegment[]> {
    return cacheGet<CustomerSegment[]>(cacheKey("analytics", "segments", organizationId), async () => {
      const thirtyDaysAgo = subDays(new Date(), 30);

      const [totalMembers, recentMembers, churnedMembers] = await Promise.all([
        prisma.organizationMembers.count({ where: { organizationId } }),
        prisma.organizationMembers.count({
          where: { organizationId, joinedAt: { gte: thirtyDaysAgo } },
        }),
        prisma.organizationMembers.count({
          where: { organizationId, isSuspended: true },
        }),
      ]);

      const total = totalMembers || 1;
      const inactiveMembers = Math.max(0, totalMembers - recentMembers);

      return [
        { name: "Active Users", count: recentMembers, percentage: Math.round((recentMembers / total) * 100), revenue: 0, description: "Joined in last 30 days" },
        { name: "Inactive Users", count: inactiveMembers, percentage: Math.round((inactiveMembers / total) * 100), revenue: 0, description: "No activity in last 30 days" },
        { name: "New Users", count: recentMembers, percentage: Math.round((recentMembers / total) * 100), revenue: 0, description: "Joined in last 30 days" },
        { name: "Power Users", count: Math.round(recentMembers * 0.2), percentage: 20, revenue: 0, description: "Top 20% by activity" },
        { name: "At Risk", count: churnedMembers, percentage: Math.round((churnedMembers / total) * 100), revenue: 0, description: "Suspended users" },
      ];
    }, 600);
  }

  static async getAIData(organizationId: string, days: number): Promise<AIDataPoint[]> {
    const cacheKeyStr = cacheKey("analytics", "ai", organizationId, `${days}`);

    return cacheGet<AIDataPoint[]>(cacheKeyStr, async () => {
      const startDate = subDays(new Date(), days);

      const records = await prisma.aiUsageDaily.findMany({
        where: { organizationId, date: { gte: startDate } },
        orderBy: { date: "asc" },
      });

      const dataMap = new Map<string, AIDataPoint>();
      for (const r of records) {
        dataMap.set(format(r.date, "yyyy-MM-dd"), {
          date: format(r.date, "yyyy-MM-dd"),
          requests: r.totalRequests || 0,
          tokens: (r.totalPromptTokens || 0) + (r.totalCompletionTokens || 0),
          cost: Number(r.totalCost) || 0,
          latency: r.averageLatency || 0,
          successRate: r.totalRequests > 0 ? ((r.successfulRequests || 0) / r.totalRequests) * 100 : 100,
        });
      }

      const result: AIDataPoint[] = [];
      for (let i = days; i >= 0; i--) {
        const date = format(subDays(new Date(), i), "yyyy-MM-dd");
        result.push(dataMap.get(date) || {
          date, requests: 0, tokens: 0, cost: 0, latency: 0, successRate: 100,
        });
      }

      return result;
    }, 300);
  }

  static async getProviderAnalytics(organizationId: string, days: number): Promise<Record<string, { requests: number; tokens: number; cost: number; latency: number }>> {
    const cacheKeyStr = cacheKey("analytics", "providers", organizationId, `${days}`);

    return cacheGet<Record<string, { requests: number; tokens: number; cost: number; latency: number }>>(cacheKeyStr, async () => {
      const startDate = subDays(new Date(), days);

      const records = await prisma.aiUsageDaily.findMany({
        where: { organizationId, date: { gte: startDate } },
        orderBy: { date: "asc" },
      });

      const providerMap: Record<string, { requests: number; tokens: number; cost: number; latency: number; count: number }> = {};

      for (const r of records) {
        const provider = r.providerId || "unknown";
        if (!providerMap[provider]) {
          providerMap[provider] = { requests: 0, tokens: 0, cost: 0, latency: 0, count: 0 };
        }
        providerMap[provider].requests += r.totalRequests || 0;
        providerMap[provider].tokens += (r.totalPromptTokens || 0) + (r.totalCompletionTokens || 0);
        providerMap[provider].cost += Number(r.totalCost) || 0;
        providerMap[provider].latency += r.averageLatency || 0;
        providerMap[provider].count += 1;
      }

      const result: Record<string, { requests: number; tokens: number; cost: number; latency: number }> = {};
      for (const [provider, data] of Object.entries(providerMap)) {
        result[provider] = {
          requests: data.requests,
          tokens: data.tokens,
          cost: Math.round(data.cost * 100) / 100,
          latency: data.count > 0 ? Math.round(data.latency / data.count) : 0,
        };
      }

      return result;
    }, 300);
  }

  static async getWorkflowData(organizationId: string, days: number): Promise<WorkflowDataPoint[]> {
    const cacheKeyStr = cacheKey("analytics", "workflows", organizationId, `${days}`);

    return cacheGet<WorkflowDataPoint[]>(cacheKeyStr, async () => {
      const startDate = subDays(new Date(), days);

      const memberUserIds = (await prisma.organizationMembers.findMany({
        where: { organizationId },
        select: { userId: true },
      })).map(m => m.userId);

      const records = await prisma.workflowRuns.findMany({
        where: { createdById: { in: memberUserIds }, createdAt: { gte: startDate } },
        orderBy: { createdAt: "asc" },
        select: { id: true, status: true, duration: true, createdAt: true },
      });

      const dailyMap = new Map<string, { runs: number; successCount: number; failedCount: number; totalDuration: number }>();

      for (const r of records) {
        const dateKey = format(r.createdAt, "yyyy-MM-dd");
        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, { runs: 0, successCount: 0, failedCount: 0, totalDuration: 0 });
        }
        const day = dailyMap.get(dateKey)!;
        day.runs++;
        if (r.status === "COMPLETED") day.successCount++;
        else if (r.status === "FAILED") day.failedCount++;
        if (r.duration) day.totalDuration += r.duration;
      }

      const result: WorkflowDataPoint[] = [];
      for (let i = days; i >= 0; i--) {
        const date = format(subDays(new Date(), i), "yyyy-MM-dd");
        const day = dailyMap.get(date);
        result.push(day ? {
          date,
          runs: day.runs,
          successCount: day.successCount,
          failedCount: day.failedCount,
          avgDuration: day.runs > 0 ? Math.round(day.totalDuration / day.runs) : 0,
        } : { date, runs: 0, successCount: 0, failedCount: 0, avgDuration: 0 });
      }

      return result;
    }, 300);
  }

  static async getPerformanceMetrics(organizationId: string): Promise<PerformanceMetrics> {
    return cacheGet<PerformanceMetrics>(cacheKey("analytics", "performance", organizationId), async () => {
      const since = subDays(new Date(), 1);

      const [apiLatencyMsAgg, apiErrorAgg, apiRequests, aiRuns] = await Promise.all([
        prisma.apiRequestLogs.aggregate({
          where: { organizationId, createdAt: { gte: since } },
          _avg: { latencyMs: true },
        }),
        prisma.apiRequestLogs.aggregate({
          where: { organizationId, createdAt: { gte: since } },
          _count: { _all: true },
          // If your schema has statusCode/wasError fields, aggregate should be updated.
        }),
        prisma.apiRequestLogs.count({ where: { organizationId, createdAt: { gte: since } } }),
        prisma.aiAgentRuns.count({ where: { organizationId, createdAt: { gte: since } } }),
      ]);

      const apiLatency = Number(apiLatencyMsAgg._avg?.latencyMs) || 0;
      // Deterministic fallbacks for missing fields in older schemas.
      const apiErrorRate = 0;

      return {
        apiLatency: Math.round(apiLatency),
        dbQueries: 0,
        cacheHitRatio: 0,
        queueProcessing: 0,
        backgroundJobs: aiRuns,
        searchPerformance: 0,
        uploadPerformance: 0,
        responseTime: Math.round(apiLatency),
        errorRate: Math.round(apiErrorRate * 10) / 10,
        memoryUsage: 0,
        cpuUsage: 0,
      };
    }, 120);
  }

  static async getCohortData(organizationId: string): Promise<CohortData[]> {
    return cacheGet<CohortData[]>(cacheKey("analytics", "cohorts", organizationId), async () => {
      const members = await prisma.organizationMembers.findMany({
        where: { organizationId },
        orderBy: { joinedAt: "asc" },
        select: { id: true, joinedAt: true, isSuspended: true },
      });

      const monthlyCohorts = new Map<string, { members: { joined: Date; isSuspended: boolean }[] }>();

      for (const m of members) {
        const key = format(m.joinedAt, "yyyy-MM");
        if (!monthlyCohorts.has(key)) monthlyCohorts.set(key, { members: [] });
        monthlyCohorts.get(key)!.members.push({ joined: m.joinedAt, isSuspended: m.isSuspended });
      }

      const cohorts: CohortData[] = [];
      const now = new Date();

      for (const [period, data] of monthlyCohorts) {
        const periods: { index: number; retention: number; revenue: number }[] = [];
        const cohortStart = new Date(period + "-01");

        for (let i = 0; i < 6; i++) {
          const periodStart = new Date(cohortStart);
          periodStart.setMonth(periodStart.getMonth() + i);
          const periodEnd = new Date(periodStart);
          periodEnd.setMonth(periodEnd.getMonth() + 1);

          if (periodEnd > now) break;

          const active = data.members.filter(m => !m.isSuspended).length;
          const retention = data.members.length > 0 ? Math.round((active / data.members.length) * 100) : 0;

          periods.push({ index: i, retention, revenue: 0 });
        }

        cohorts.push({ period, customers: data.members.length, periods });
      }

      return cohorts.sort((a, b) => a.period.localeCompare(b.period)).slice(-12);
    }, 3600);
  }

  static async getConversionFunnel(organizationId: string): Promise<{ stage: string; count: number; conversion: number }[]> {
    const totalMembers = await prisma.organizationMembers.count({ where: { organizationId } });
    const recentMembers = await prisma.organizationMembers.count({
      where: { organizationId, joinedAt: { gte: subDays(new Date(), 30) } },
    });
    const memberUserIds = (await prisma.organizationMembers.findMany({
      where: { organizationId },
      select: { userId: true },
    })).map(m => m.userId);
    const generatingCount = await prisma.generations.count({
      where: { userId: { in: memberUserIds }, createdAt: { gte: subDays(new Date(), 30) } },
    });
    const payingMembers = await prisma.subscriptions.count({
      where: { userId: { in: memberUserIds }, status: "ACTIVE" },
    });

    const stages = [
      { stage: "Signed Up", count: totalMembers },
      { stage: "Activated", count: recentMembers },
      { stage: "Generated Content", count: generatingCount },
      { stage: "Paying Customer", count: payingMembers },
    ];

    return stages.map((s, i) => ({
      ...s,
      conversion: i === 0 ? 100 : Math.round((s.count / stages[i - 1].count) * 100),
    }));
  }

  static async getRetentionRate(organizationId: string, days: number): Promise<number> {
    const startDate = subDays(new Date(), days);
    const members = await prisma.organizationMembers.count({ where: { organizationId, joinedAt: { lte: startDate } } });
    const active = await prisma.organizationMembers.count({
      where: { organizationId, joinedAt: { lte: startDate }, isSuspended: false },
    });
    return members > 0 ? Math.round((active / members) * 100) : 100;
  }

  private static async getRevenueMetrics(start: Date, end: Date): Promise<{
    mrr: number; grossRevenue: number; netRevenue: number; expansionRevenue: number; contractionRevenue: number;
  }> {
    const records = await prisma.revenueMetrics.findMany({
      where: { date: { gte: start, lte: end } },
    });

    if (records.length === 0) {
      return { mrr: 0, grossRevenue: 0, netRevenue: 0, expansionRevenue: 0, contractionRevenue: 0 };
    }

    const latest = records[records.length - 1];
    return {
      mrr: Number(latest.mrr) || 0,
      grossRevenue: Number(latest.mrr) || 0,
      netRevenue: Number(latest.mrr) || 0,
      expansionRevenue: Number(latest.expansionMrr) || 0,
      contractionRevenue: Number(latest.churnMrr) || 0,
    };
  }

  private static async getCustomerMetrics(start: Date, end: Date): Promise<{
    activeCustomers: number; newCustomers: number; churnedCustomers: number; totalCustomers: number; churnRate: number; ltv: number; cac: number;
  }> {
    const records = await prisma.revenueMetrics.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: "desc" },
    });

    const latest = records[0];
    if (!latest) {
      return { activeCustomers: 0, newCustomers: 0, churnedCustomers: 0, totalCustomers: 0, churnRate: 0, ltv: 0, cac: 0 };
    }

    return {
      activeCustomers: latest.activeSubscriptions || 0,
      newCustomers: latest.newCustomers || 0,
      churnedCustomers: latest.churnedCount || 0,
      totalCustomers: latest.totalCustomers || 0,
      churnRate: latest.totalCustomers > 0 ? Math.round(((latest.churnedCount || 0) / latest.totalCustomers) * 10000) / 100 : 0,
      ltv: 0,
      cac: 0,
    };
  }

  private static async getTotalApiUsage(organizationId: string, since: Date): Promise<number> {
    const result = await prisma.apiRequestLogs.aggregate({
      where: { organizationId, createdAt: { gte: since } },
      _count: true,
    });
    return result._count || 0;
  }

  private static async getTotalAiUsage(organizationId: string, start: Date, end: Date): Promise<{ totalRequests: number }> {
    const result = await prisma.aiUsageDaily.aggregate({
      where: { organizationId, date: { gte: start, lte: end } },
      _sum: { totalRequests: true },
    });
    return { totalRequests: result._sum?.totalRequests || 0 };
  }

  private static async getMemberUserIds(organizationId: string): Promise<string[]> {
    return cacheGet<string[]>(cacheKey("analytics", "member-ids", organizationId), async () => {
      const members = await prisma.organizationMembers.findMany({
        where: { organizationId },
        select: { userId: true },
      });
      return members.map(m => m.userId);
    }, 120);
  }

  static async getTotalCredits(organizationId: string, start: Date, end: Date): Promise<number> {
    const memberUserIds = await AnalyticsEngine.getMemberUserIds(organizationId);
    if (memberUserIds.length === 0) return 0;
    const result = await prisma.usageLog.aggregate({
      where: { userId: { in: memberUserIds }, createdAt: { gte: start, lte: end } },
      _sum: { creditsConsumed: true },
    });
    return result._sum?.creditsConsumed || 0;
  }

  private static async getStorageUsage(organizationId: string): Promise<number> {
    const memberUserIds = (await prisma.organizationMembers.findMany({
      where: { organizationId },
      select: { userId: true },
    })).map(m => m.userId);
    const [knowledgeDocs, genCount] = await Promise.all([
      prisma.knowledgeDocuments.count({ where: { organizationId } }),
      prisma.generations.count({ where: { userId: { in: memberUserIds } } }),
    ]);
    return knowledgeDocs * 50 + genCount * 10;
  }

  private static async getTotalWorkflowExecutions(organizationId: string, start: Date, end: Date): Promise<number> {
    const memberUserIds = (await prisma.organizationMembers.findMany({
      where: { organizationId },
      select: { userId: true },
    })).map(m => m.userId);
    if (memberUserIds.length === 0) return 0;
    return prisma.workflowRuns.count({ where: { createdById: { in: memberUserIds }, createdAt: { gte: start, lte: end } } });
  }

  private static async getProviderUsage(organizationId: string, start: Date, end: Date): Promise<Record<string, number>> {
    const records = await prisma.aiUsageDaily.findMany({
      where: { organizationId, date: { gte: start, lte: end } },
    });

    const result: Record<string, number> = {};
    for (const r of records) {
      const provider = r.providerId || "unknown";
      result[provider] = (result[provider] || 0) + (r.totalRequests || 0);
    }
    return result;
  }

  private static async getMarketplaceInstalls(organizationId: string): Promise<number> {
    return prisma.installedIntegrations.count({ where: { organizationId } });
  }

  private static async getCacheHitRatio(): Promise<number> {
    return 85;
  }

  private static computeTrends(current: Record<string, number>, previous: Record<string, number>): Record<string, { value: number; change: number; direction: "up" | "down" | "stable" }> {
    const trends: Record<string, { value: number; change: number; direction: "up" | "down" | "stable" }> = {};
    const fields = ["mrr", "arr", "netRevenue", "grossRevenue"];

    for (const field of fields) {
      const curr = current[field] || 0;
      const prev = previous[field] || 0;
      const change = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0;
      trends[field] = {
        value: curr,
        change: Math.abs(change),
        direction: change > 0 ? "up" : change < 0 ? "down" : "stable",
      };
    }

    return trends;
  }
}
