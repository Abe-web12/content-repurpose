import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

interface LogEntry {
  organizationId?: string;
  apiKeyId?: string;
  userId?: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  idempotencyKey?: string;
  rateLimited?: boolean;
  error?: string;
}

export class ApiLogger {
  static async log(entry: LogEntry): Promise<void> {
    await prisma.apiRequestLogs.create({
      data: {
        organizationId: entry.organizationId,
        apiKeyId: entry.apiKeyId,
        userId: entry.userId,
        method: entry.method,
        path: entry.path,
        status: entry.status,
        latencyMs: entry.duration,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        requestId: entry.requestId,
        idempotencyKey: entry.idempotencyKey,
        rateLimited: entry.rateLimited || false,
        error: entry.error,
      },
    });

    if (entry.organizationId) {
      await this.updateDailyUsage(entry.organizationId, entry.apiKeyId, entry.status, entry.duration);
    }
  }

  private static async updateDailyUsage(
    organizationId: string,
    apiKeyId?: string,
    status?: number,
    duration?: number
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isError = status ? status >= 400 : false;

    try {
      await prisma.dailyApiUsage.upsert({
        where: {
          organizationId_apiKeyId_date: {
            organizationId,
            apiKeyId: apiKeyId || "",
            date: today,
          },
        },
        create: {
          organizationId,
          apiKeyId: apiKeyId || "",
          date: today,
          requestCount: 1,
          successCount: isError ? 0 : 1,
          errorCount: isError ? 1 : 0,
          totalDuration: duration || 0,
        },
        update: {
          requestCount: { increment: 1 },
          successCount: isError ? undefined : { increment: 1 },
          errorCount: isError ? { increment: 1 } : undefined,
          totalDuration: { increment: duration || 0 },
        },
      });
    } catch {}
  }

  static async getUsageStats(
    organizationId: string,
    options: { startDate?: Date; endDate?: Date; apiKeyId?: string } = {}
  ) {
    const where: any = { organizationId };
    if (options.apiKeyId) where.apiKeyId = options.apiKeyId;
    if (options.startDate || options.endDate) {
      where.date = {};
      if (options.startDate) where.date.gte = options.startDate;
      if (options.endDate) where.date.lte = options.endDate;
    }

    const usage = await prisma.dailyApiUsage.findMany({
      where,
      orderBy: { date: "asc" },
    });

    return usage;
  }

  static async getRequestLogs(
    organizationId: string,
    options: {
      limit?: number;
      offset?: number;
      path?: string;
      status?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    const where: any = { organizationId };
    if (options.path) where.path = { contains: options.path };
    if (options.status) where.status = options.status;
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    return prisma.apiRequestLogs.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    });
  }

  static async getAggregatedStats(
    organizationId: string,
    options: { days?: number } = {}
  ) {
    const days = options.days || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalRequests, successCount, errorCount, avgDuration, topPaths, hourlyData] = await Promise.all([
      prisma.apiRequestLogs.count({
        where: { organizationId, createdAt: { gte: since } },
      }),
      prisma.apiRequestLogs.count({
        where: { organizationId, createdAt: { gte: since }, status: { lt: 400 } },
      }),
      prisma.apiRequestLogs.count({
        where: { organizationId, createdAt: { gte: since }, status: { gte: 400 } },
      }),
      prisma.apiRequestLogs.aggregate({
        where: { organizationId, createdAt: { gte: since } },
        _avg: { latencyMs: true },
      }),
      prisma.apiRequestLogs.groupBy({
        by: ["path"],
        where: { organizationId, createdAt: { gte: since } },
        _count: { id: true },
        _avg: { latencyMs: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.apiRequestLogs.groupBy({
        by: ["createdAt"],
        where: { organizationId, createdAt: { gte: since } },
        _count: { id: true },
      }),
    ]);

    return {
      totalRequests,
      successCount,
      errorCount,
      successRate: totalRequests > 0 ? ((successCount / totalRequests) * 100).toFixed(2) : "100.00",
      avgDuration: avgDuration._avg?.latencyMs ? Math.round(avgDuration._avg.latencyMs) : 0,
      topPaths: topPaths.map((p) => ({
        path: p.path,
        count: p._count.id,
        avgDuration: Math.round(p._avg.latencyMs || 0),
      })),
      daily: hourlyData.map((h) => ({
        date: h.createdAt,
        count: h._count.id,
      })),
    };
  }

  static async getRateLimitStats(organizationId: string, days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [rateLimited, total] = await Promise.all([
      prisma.apiRequestLogs.count({
        where: { organizationId, createdAt: { gte: since }, rateLimited: true },
      }),
      prisma.apiRequestLogs.count({
        where: { organizationId, createdAt: { gte: since } },
      }),
    ]);

    return {
      rateLimited,
      total,
      rateLimitRate: total > 0 ? ((rateLimited / total) * 100).toFixed(2) : "0.00",
    };
  }
}
