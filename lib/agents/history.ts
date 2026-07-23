import { prisma } from "@/lib/prisma";

export class AgentHistory {
  static async recordStep(runId: string, step: {
    nodeId: string;
    status: string;
    output?: unknown;
    error?: string;
  }) {
    return prisma.aiAgentTasks.create({
      data: {
        runId,
        organizationId: "", // Will be set properly in context
        userId: "",
        title: step.nodeId,
        description: step.nodeId,
        status: (step.status as any) ?? "COMPLETED",
        toolType: step.nodeId,
        output: step.output as any,
        error: step.error,
        completedAt: step.status === "COMPLETED" || step.status === "FAILED" ? new Date() : null,
      },
    });
  }

  static async getRunHistory(agentId: string, options?: { limit?: number; cursor?: string; status?: string }) {
    const where: Record<string, unknown> = { agentId };
    if (options?.status) where.status = options.status;

    const limit = Math.min(options?.limit ?? 20, 100);
    const runs = await prisma.aiAgentRuns.findMany({
      where,
      take: limit + 1,
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = runs.length > limit;
    const data = hasMore ? runs.slice(0, limit) : runs;
    return { data, nextCursor: hasMore ? data[data.length - 1].id : null, hasMore };
  }

  static async getRunDetail(runId: string) {
    const run = await prisma.aiAgentRuns.findUnique({
      where: { id: runId },
    }) as any;
    if (!run) return null;
    const steps = await prisma.aiAgentTasks.findMany({
      where: { runId },
      orderBy: { createdAt: "asc" },
    });
    return { ...run, steps };
  }

  static async getTaskHistory(agentId: string, options?: { limit?: number; status?: string }) {
    const where: Record<string, unknown> = { agentId };
    if (options?.status) where.status = options.status;

    return prisma.aiAgentTasks.findMany({
      where,
      take: options?.limit ?? 50,
      orderBy: { createdAt: "desc" },
    });
  }
}
