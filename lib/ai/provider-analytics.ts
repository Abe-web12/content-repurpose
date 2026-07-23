import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export class AIAnalytics {
  static async getDailyUsage(options: {
    organizationId?: string;
    providerId?: string;
    days?: number;
  }) {
    const days = options.days ?? 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where: Prisma.AiUsageWhereInput = {
      date: { gte: startDate },
    };
    if (options.organizationId) where.organizationId = options.organizationId;
    if (options.providerId) where.providerId = options.providerId;

    return prisma.aiUsage.findMany({ where, orderBy: { date: "asc" } });
  }

  static async getMonthlyUsage(options: {
    organizationId?: string;
    providerId?: string;
    months?: number;
  }) {
    const months = options.months ?? 6;

    const results = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const where: Prisma.AiUsageWhereInput = {
        date: { gte: startOfMonth, lte: endOfMonth },
      };
      if (options.organizationId) where.organizationId = options.organizationId;
      if (options.providerId) where.providerId = options.providerId;

      const records = await prisma.aiUsage.findMany({ where });
      const totals = records.reduce(
        (acc, r) => ({
          totalTokens: acc.totalTokens + r.totalTokens,
          totalCost: acc.totalCost + r.estimatedCost,
          totalRequests: acc.totalRequests + r.requestCount,
          promptTokens: acc.promptTokens + r.promptTokens,
          completionTokens: acc.completionTokens + r.completionTokens,
        }),
        { totalTokens: 0, totalCost: 0, totalRequests: 0, promptTokens: 0, completionTokens: 0 }
      );

      results.push({
        month: startOfMonth.toISOString().slice(0, 7),
        ...totals,
      });
    }

    return results;
  }

  static async getProviderUsage(options: { startDate: Date; endDate: Date }) {
    const records = await prisma.aiUsage.findMany({
      where: {
        date: { gte: options.startDate, lte: options.endDate },
      },
    });

    const byProvider: Record<string, { totalTokens: number; totalCost: number; requestCount: number }> = {};
    for (const r of records) {
      if (!byProvider[r.providerId]) {
        byProvider[r.providerId] = { totalTokens: 0, totalCost: 0, requestCount: 0 };
      }
      byProvider[r.providerId].totalTokens += r.totalTokens;
      byProvider[r.providerId].totalCost += r.estimatedCost;
      byProvider[r.providerId].requestCount += r.requestCount;
    }

    const providers = await prisma.aiProviders.findMany({
      where: { id: { in: Object.keys(byProvider) } },
      select: { id: true, name: true, displayName: true },
    });

    const providerMap = Object.fromEntries(providers.map((p) => [p.id, p]));

    return Object.entries(byProvider).map(([providerId, stats]) => ({
      provider: providerMap[providerId],
      ...stats,
    }));
  }

  static async getModelUsage(options: { startDate: Date; endDate: Date }) {
    const records = await prisma.aiUsage.findMany({
      where: {
        date: { gte: options.startDate, lte: options.endDate },
      },
    });

    const byModel: Record<string, { totalTokens: number; totalCost: number; requestCount: number }> = {};
    for (const r of records) {
      if (!byModel[r.model]) {
        byModel[r.model] = { totalTokens: 0, totalCost: 0, requestCount: 0 };
      }
      byModel[r.model].totalTokens += r.totalTokens;
      byModel[r.model].totalCost += r.estimatedCost;
      byModel[r.model].requestCount += r.requestCount;
    }

    return Object.entries(byModel)
      .map(([model, stats]) => ({ model, ...stats }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }

  static async getOrganizationUsage(options: { startDate: Date; endDate: Date }) {
    const records = await prisma.aiUsage.findMany({
      where: {
        date: { gte: options.startDate, lte: options.endDate },
      },
    });

    const byOrg: Record<string, { totalTokens: number; totalCost: number; requestCount: number }> = {};
    for (const r of records) {
      if (!byOrg[r.organizationId]) {
        byOrg[r.organizationId] = { totalTokens: 0, totalCost: 0, requestCount: 0 };
      }
      byOrg[r.organizationId].totalTokens += r.totalTokens;
      byOrg[r.organizationId].totalCost += r.estimatedCost;
      byOrg[r.organizationId].requestCount += r.requestCount;
    }

    return Object.entries(byOrg)
      .map(([orgId, stats]) => ({ organizationId: orgId, ...stats }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }

  static async getRequestAnalytics(options: {
    organizationId?: string;
    providerId?: string;
    startDate: Date;
    endDate: Date;
  }) {
    const where: Prisma.AiRequestsWhereInput = {
      requestedAt: { gte: options.startDate, lte: options.endDate },
    };
    if (options.organizationId) where.organizationId = options.organizationId;
    if (options.providerId) where.providerId = options.providerId;

    const [totalRequests, completedRequests, failedRequests] = await Promise.all([
      prisma.aiRequests.count({ where }),
      prisma.aiRequests.count({ where: { ...where, status: "COMPLETED" } }),
      prisma.aiRequests.count({ where: { ...where, status: "FAILED" } }),
    ]);

    const latencyAgg = await prisma.aiRequests.aggregate({
      where: { ...where, status: "COMPLETED" },
      _avg: { latency: true },
    });

    const costAgg = await prisma.aiRequests.aggregate({
      where,
      _sum: { estimatedCost: true },
      _avg: { estimatedCost: true },
    });

    return {
      totalRequests,
      completedRequests,
      failedRequests,
      successRate: totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0,
      failureRate: totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0,
      averageLatency: latencyAgg._avg.latency ?? 0,
      totalCost: costAgg._sum.estimatedCost ?? 0,
      averageCost: costAgg._avg.estimatedCost ?? 0,
    };
  }
}
