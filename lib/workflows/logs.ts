import { prisma } from "@/lib/prisma";

export class WorkflowLogs {
  static async log(workflowId: string, message: string, options?: {
    runId?: string;
    level?: string;
    metadata?: Record<string, unknown>;
    userId?: string;
  }) {
    try {
      await prisma.workflowExecutionLogs.create({
        data: {
          workflowId,
          runId: options?.runId ?? null,
          level: options?.level ?? "info",
          message,
          metadata: (options?.metadata ?? {}) as any,
          createdById: options?.userId ?? "system",
        },
      });
    } catch {
      // Non-critical
    }
  }

  static async getLogs(workflowId: string, options?: {
    runId?: string;
    level?: string;
    limit?: number;
    cursor?: string;
  }) {
    const where: Record<string, unknown> = { workflowId };
    if (options?.runId) where.runId = options.runId;
    if (options?.level) where.level = options.level;

    const limit = Math.min(options?.limit ?? 50, 200);
    const logs = await prisma.workflowExecutionLogs.findMany({
      where,
      take: limit + 1,
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = logs.length > limit;
    const data = hasMore ? logs.slice(0, limit) : logs;
    return { data, nextCursor: hasMore ? data[data.length - 1].id : null, hasMore };
  }

  static async getRunLogs(runId: string, options?: { level?: string; limit?: number }) {
    const where: Record<string, unknown> = { runId };
    if (options?.level) where.level = options.level;

    return prisma.workflowExecutionLogs.findMany({
      where,
      take: options?.limit ?? 100,
      orderBy: { createdAt: "asc" },
    });
  }

  static async clear(workflowId: string) {
    return prisma.workflowExecutionLogs.deleteMany({ where: { workflowId } });
  }
}
