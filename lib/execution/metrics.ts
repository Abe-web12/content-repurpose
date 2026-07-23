import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

export interface RunMetrics {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  cancelledRuns: number;
  timedOutRuns: number;
  avgDuration: number;
  totalDuration: number;
  successRate: number;
  retryCount: number;
}

export interface NodeMetrics {
  nodeType: string;
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  avgDuration: number;
  totalDuration: number;
}

const METRICS_TTL = 3600;

export class ExecutionMetrics {
  static async recordRunMetrics(runId: string): Promise<void> {
    const run = await prisma.workflowRuns.findUnique({
      where: { id: runId },
    });
    if (!run) return;

    const runData = {
      workflowId: run.workflowId,
      status: run.status,
      duration: run.duration ?? 0,
      retryCount: run.retryCount,
      triggerType: run.triggerType,
      createdAt: run.createdAt.toISOString(),
    };

    const key = `metrics:run:${run.workflowId}`;
    await redis.lpush(key, JSON.stringify(runData));
    await redis.ltrim(key, 0, 999);
    await redis.expire(key, METRICS_TTL);

    const totalKey = `metrics:workflow:${run.workflowId}`;
    await redis.hincrby(totalKey, "totalRuns", 1);
    await redis.hincrby(totalKey, `${run.status.toLowerCase()}Runs`, 1);
    await redis.hincrby(totalKey, "totalDuration", run.duration ?? 0);
    await redis.hincrby(totalKey, "totalRetries", run.retryCount);
    await redis.expire(totalKey, METRICS_TTL);
  }

  static async getWorkflowMetrics(workflowId: string): Promise<RunMetrics> {
    const totalKey = `metrics:workflow:${workflowId}`;
    const data = await redis.hgetall(totalKey);

    if (!data || Object.keys(data).length === 0) {
      return {
        totalRuns: 0,
        completedRuns: 0,
        failedRuns: 0,
        cancelledRuns: 0,
        timedOutRuns: 0,
        avgDuration: 0,
        totalDuration: 0,
        successRate: 0,
        retryCount: 0,
      };
    }

    const totalRuns = parseInt((data.totalRuns as string) || "0", 10);
    const completedRuns = parseInt((data.completedRuns as string) || "0", 10);
    const failedRuns = parseInt((data.failedRuns as string) || "0", 10);
    const totalDuration = parseInt((data.totalDuration as string) || "0", 10);
    const retryCount = parseInt((data.totalRetries as string) || "0", 10);

    const completedKey = `metrics:completed:${workflowId}`;
    const completedList = await redis.lrange(completedKey, 0, -1);
    const durations = completedList.map((s) => {
      try {
        return JSON.parse(s as string).duration || 0;
      } catch {
        return 0;
      }
    });
    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
        : 0;

    return {
      totalRuns,
      completedRuns,
      failedRuns: parseInt((data.failedruns as string) || "0", 10),
      cancelledRuns: parseInt((data.cancelledruns as string) || "0", 10),
      timedOutRuns: parseInt((data.timedoutruns as string) || "0", 10),
      avgDuration,
      totalDuration,
      successRate: totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0,
      retryCount,
    };
  }

  static async recordNodeMetrics(runId: string): Promise<void> {
    const steps = await prisma.workflowRunSteps.findMany({
      where: { runId },
    });

    for (const step of steps) {
      if (!step.nodeType) continue;
      const key = `metrics:node:${step.nodeType}`;
      await redis.hincrby(key, "totalExecutions", 1);
      if (step.status === "COMPLETED") {
        await redis.hincrby(key, "completedExecutions", 1);
      } else if (step.status === "FAILED") {
        await redis.hincrby(key, "failedExecutions", 1);
      }
      await redis.hincrby(key, "totalDuration", step.duration ?? 0);
      await redis.expire(key, METRICS_TTL);
    }
  }

  static async getNodeMetrics(nodeType: string): Promise<NodeMetrics> {
    const key = `metrics:node:${nodeType}`;
    const data = await redis.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      return {
        nodeType,
        totalExecutions: 0,
        completedExecutions: 0,
        failedExecutions: 0,
        avgDuration: 0,
        totalDuration: 0,
      };
    }

    const totalExecutions = parseInt((data.totalExecutions as string) || "0", 10);
    const totalDuration = parseInt((data.totalDuration as string) || "0", 10);

    return {
      nodeType,
      totalExecutions,
      completedExecutions: parseInt((data.completedExecutions as string) || "0", 10),
      failedExecutions: parseInt((data.failedExecutions as string) || "0", 10),
      avgDuration: totalExecutions > 0 ? Math.round(totalDuration / totalExecutions) : 0,
      totalDuration,
    };
  }

  static async getRecentRuns(workflowId: string, limit = 10): Promise<unknown[]> {
    const key = `metrics:run:${workflowId}`;
    const runs = await redis.lrange(key, 0, limit - 1);
    return runs.map((r) => {
      try {
        return JSON.parse(r as string);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  static async clearMetrics(workflowId: string): Promise<void> {
    const keys = await redis.keys(`metrics:*:${workflowId}`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
