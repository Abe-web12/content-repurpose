import { prisma } from "@/lib/prisma";

export class WorkflowHistory {
  static async getRuns(workflowId: string, options?: {
    status?: string;
    limit?: number;
    cursor?: string;
  }) {
    const where: Record<string, unknown> = { workflowId };
    if (options?.status) where.status = options.status;

    const limit = Math.min(options?.limit ?? 20, 100);
    const runs = await prisma.workflowRuns.findMany({
      where,
      take: limit + 1,
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        steps: { orderBy: { startedAt: "asc" } },
      },
    });

    const hasMore = runs.length > limit;
    const data = hasMore ? runs.slice(0, limit) : runs;
    return { data, nextCursor: hasMore ? data[data.length - 1].id : null, hasMore };
  }

  static async getRunById(runId: string) {
    return prisma.workflowRuns.findUnique({
      where: { id: runId },
      include: {
        workflow: true,
        steps: { orderBy: { startedAt: "asc" } },
      },
    });
  }

  static async getWorkflowMetrics(workflowId: string) {
    const runs = await prisma.workflowRuns.findMany({
      where: { workflowId },
      select: { status: true, duration: true, createdAt: true },
    });

    const total = runs.length;
    const completed = runs.filter((r) => r.status === "COMPLETED").length;
    const failed = runs.filter((r) => r.status === "FAILED").length;
    const cancelled = runs.filter((r) => r.status === "CANCELLED").length;
    const durations = runs.filter((r) => r.duration != null).map((r) => r.duration as number);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    return {
      total,
      completed,
      failed,
      cancelled,
      successRate: total > 0 ? (completed / total) * 100 : 0,
      failureRate: total > 0 ? (failed / total) * 100 : 0,
      averageDuration: avgDuration,
      runsByDay: this.groupByDay(runs),
    };
  }

  static async getOrganizationMetrics(organizationId: string) {
    const workflows = await prisma.workflows.findMany({
      where: { organizationId, deletedAt: null },
    });

    const workflowIds = workflows.map((w) => w.id);
    const runs = await prisma.workflowRuns.findMany({
      where: { workflowId: { in: workflowIds } },
    });

    const total = runs.length;
    const completed = runs.filter((r) => r.status === "COMPLETED").length;
    const failed = runs.filter((r) => r.status === "FAILED").length;
    const durations = runs.filter((r) => r.duration != null).map((r) => r.duration as number);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    return {
      totalWorkflows: workflows.length,
      totalRuns: total,
      completedRuns: completed,
      failedRuns: failed,
      successRate: total > 0 ? (completed / total) * 100 : 0,
      averageDuration: avgDuration,
    };
  }

  private static groupByDay(runs: Array<{ createdAt: Date }>): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const run of runs) {
      const day = run.createdAt.toISOString().slice(0, 10);
      groups[day] = (groups[day] || 0) + 1;
    }
    return groups;
  }
}
