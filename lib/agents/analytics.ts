import { prisma } from "@/lib/prisma";

export class AgentAnalytics {
  static async getRunStats(agentId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const runs = await prisma.aiAgentRuns.findMany({
      where: { agentId, createdAt: { gte: since } },
    });

    const total = runs.length;
    const succeeded = runs.filter((r) => r.status === "COMPLETED").length;
    const failed = runs.filter((r) => r.status === "FAILED").length;
    const runsWithDuration = runs.filter((r) => r.duration);
    const avgDuration = runsWithDuration.length > 0
      ? runsWithDuration.reduce((sum, r) => sum + (r.duration ?? 0), 0) / runsWithDuration.length
      : 0;

    return {
      totalRuns: total,
      successCount: succeeded,
      failureCount: failed,
      successRate: total > 0 ? (succeeded / total) * 100 : 0,
      avgDuration,
      totalTokens: runs.reduce((sum, r) => sum + (r.tokensUsed ?? 0), 0),
      totalCost: runs.reduce((sum, r) => sum + (r.cost ?? 0), 0),
    };
  }

  static async getToolUsage(agentId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const tasks = await prisma.aiAgentTasks.findMany({
      where: { agentId, createdAt: { gte: since } },
    });

    const usage: Record<string, number> = {};
    for (const task of tasks) {
      const key = task.toolType ?? "unknown";
      usage[key] = (usage[key] ?? 0) + 1;
    }

    return Object.entries(usage).map(([tool, count]) => ({ tool, count }));
  }

  static async getMemoryStats(agentId: string) {
    const [totalMemories, memoriesByType] = await Promise.all([
      prisma.aiAgentMemories.count({ where: { agentId } }),
      prisma.aiAgentMemories.groupBy({
        by: ["type"],
        where: { agentId },
        _count: true,
      }),
    ]);

    return {
      totalMemories,
      byType: memoriesByType.map((m) => ({ type: m.type, count: m._count })),
    };
  }

  static async getKnowledgeStats(agentId: string) {
    const knowledgeBases = await prisma.aiAgentKnowledgeBases.findMany({
      where: { agentId },
    }) as any[];

    const docCounts = await (prisma.aiAgentKnowledgeDocuments.groupBy as any)({
      by: ["knowledgeBaseId"],
      where: { knowledgeBaseId: { in: knowledgeBases.map((kb: any) => kb.id) } },
      _count: true,
    }) as any[];

    const countMap = new Map(docCounts.map((d) => [d.knowledgeBaseId, d._count]));

    return knowledgeBases.map((kb: any) => ({
      id: kb.id,
      name: kb.name,
      documentCount: countMap.get(kb.id) ?? 0,
    }));
  }

  static async recordDaily(agentId: string, organizationId: string, stats: {
    runsCount?: number;
    successCount?: number;
    failureCount?: number;
    totalTokens?: number;
    totalCost?: number;
    avgLatency?: number;
    toolCalls?: number;
    memoryRetrievals?: number;
    knowledgeRetrievals?: number;
  }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return prisma.aiAgentAnalytics.upsert({
      where: { agentId_date: { agentId, date: today } },
      update: {
        runsCount: { increment: stats.runsCount ?? 0 },
        successCount: { increment: stats.successCount ?? 0 },
        failureCount: { increment: stats.failureCount ?? 0 },
        totalTokens: { increment: stats.totalTokens ?? 0 },
        totalCost: { increment: stats.totalCost ?? 0 },
        toolCalls: { increment: stats.toolCalls ?? 0 },
        memoryRetrievals: { increment: stats.memoryRetrievals ?? 0 },
        knowledgeRetrievals: { increment: stats.knowledgeRetrievals ?? 0 },
      },
      create: {
        agentId,
        organizationId,
        date: today,
        runsCount: stats.runsCount ?? 0,
        successCount: stats.successCount ?? 0,
        failureCount: stats.failureCount ?? 0,
        totalTokens: stats.totalTokens ?? 0,
        totalCost: stats.totalCost ?? 0,
        avgLatency: stats.avgLatency ?? 0,
        toolCalls: stats.toolCalls ?? 0,
        memoryRetrievals: stats.memoryRetrievals ?? 0,
        knowledgeRetrievals: stats.knowledgeRetrievals ?? 0,
      },
    });
  }
}
