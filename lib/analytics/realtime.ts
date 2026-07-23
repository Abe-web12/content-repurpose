import { prisma } from "@/lib/prisma";
import { cacheGet, cacheKey } from "@/lib/utils/cache";
import { subMinutes, format } from "date-fns";

export interface RealtimeEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface RealtimeSnapshot {
  activeUsers: number;
  requestsPerMinute: number;
  aiRequestsPerMinute: number;
  workflowRunsPerMinute: number;
  creditConsumedPerMinute: number;
  recentEvents: RealtimeEvent[];
  updatedAt: string;
}

export class RealtimeEngine {
  static async getSnapshot(organizationId: string, windowMinutes = 5): Promise<RealtimeSnapshot> {
    const cacheKeyStr = cacheKey("analytics", "realtime", organizationId, `${windowMinutes}`);
    return cacheGet<RealtimeSnapshot>(cacheKeyStr, async () => {
      const since = subMinutes(new Date(), windowMinutes);

      const memberUserIds = (await prisma.organizationMembers.findMany({
        where: { organizationId },
        select: { userId: true },
      })).map((m) => m.userId);

      const [activeGenerations, apiLogs, aiDaily, workflowRuns, recentEvents] = await Promise.all([
        prisma.generations.count({
          where: { userId: { in: memberUserIds }, createdAt: { gte: since } },
        }),
        prisma.apiRequestLogs.findMany({
          where: { organizationId, createdAt: { gte: since } },
          select: { createdAt: true },
        }),
        prisma.analyticsAiMetrics.aggregate({
          where: { organizationId, date: { gte: new Date(Date.now() - windowMinutes * 60000) } },
          _sum: { requests: true, totalTokens: true },
        }),
        prisma.workflowRuns.count({ where: { createdById: { in: memberUserIds }, createdAt: { gte: since } } }),
        prisma.analyticsRealTimeEvents.findMany({
          where: { organizationId },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

      const totalSeconds = windowMinutes * 60;
      return {
        activeUsers: activeGenerations,
        requestsPerMinute: Math.round((apiLogs.length / totalSeconds) * 100) / 100,
        aiRequestsPerMinute: Math.round(((aiDaily._sum?.requests ?? 0) / totalSeconds) * 100) / 100,
        workflowRunsPerMinute: Math.round((workflowRuns / totalSeconds) * 100) / 100,
        creditConsumedPerMinute: 0,
        recentEvents: recentEvents.map((e) => ({
          id: e.id,
          type: e.type,
          payload: (e.payload as Record<string, unknown>) || {},
          createdAt: e.createdAt.toISOString(),
        })),
        updatedAt: new Date().toISOString(),
      };
    }, 30);
  }

  static async recordEvent(organizationId: string, type: string, payload: Record<string, unknown>): Promise<void> {
    await prisma.analyticsRealTimeEvents.create({
      data: { organizationId, type, payload: payload as object },
    });
  }
}