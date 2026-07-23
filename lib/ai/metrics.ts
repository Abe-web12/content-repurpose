import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

const METRICS_TTL = 86400;

export class AiMetrics {
  static async recordGeneration(
    jobId: string,
    metrics: {
      provider: string;
      model: string;
      duration: number;
      queueWait: number;
      promptTokens: number;
      completionTokens: number;
      success: boolean;
      retryCount: number;
      cancelled: boolean;
    },
  ): Promise<void> {
    const timestamp = Date.now();
    const key = `ai:metrics:gen`;
    const dayKey = `ai:metrics:daily:${new Date().toISOString().slice(0, 10)}`;

    await redis.hincrby(key, "totalGenerations", 1);
    await redis.hincrby(key, metrics.success ? "successfulGenerations" : "failedGenerations", 1);
    await redis.hincrby(key, "totalDuration", metrics.duration);
    await redis.hincrby(key, "totalQueueWait", metrics.queueWait);
    await redis.hincrby(key, "totalPromptTokens", metrics.promptTokens);
    await redis.hincrby(key, "totalCompletionTokens", metrics.completionTokens);
    await redis.hincrby(key, "totalRetries", metrics.retryCount);
    if (metrics.cancelled) await redis.hincrby(key, "totalCancelled", 1);
    await redis.expire(key, METRICS_TTL);

    await redis.hincrby(dayKey, "totalGenerations", 1);
    await redis.hincrby(dayKey, metrics.success ? "successful" : "failed", 1);
    await redis.hincrby(dayKey, "totalDuration", metrics.duration);
    await redis.hincrby(dayKey, "totalTokens", metrics.promptTokens + metrics.completionTokens);
    await redis.expire(dayKey, METRICS_TTL * 7);

    const providerKey = `ai:metrics:provider:${metrics.provider}`;
    await redis.hincrby(providerKey, "totalCalls", 1);
    await redis.hincrby(providerKey, metrics.success ? "successfulCalls" : "failedCalls", 1);
    await redis.hincrby(providerKey, "totalDuration", metrics.duration);
    await redis.expire(providerKey, METRICS_TTL);
  }

  static async getMetrics(): Promise<{
    totalGenerations: number;
    successfulGenerations: number;
    failedGenerations: number;
    totalCancelled: number;
    avgDuration: number;
    avgQueueWait: number;
    totalTokens: number;
    totalRetries: number;
    successRate: number;
  }> {
    const key = `ai:metrics:gen`;
    const data = await redis.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      return {
        totalGenerations: 0,
        successfulGenerations: 0,
        failedGenerations: 0,
        totalCancelled: 0,
        avgDuration: 0,
        avgQueueWait: 0,
        totalTokens: 0,
        totalRetries: 0,
        successRate: 0,
      };
    }

    const totalGenerations = parseInt((data.totalGenerations as string) || "0", 10);
    const successfulGenerations = parseInt((data.successfulGenerations as string) || "0", 10);
    const totalDuration = parseInt((data.totalDuration as string) || "0", 10);

    return {
      totalGenerations,
      successfulGenerations,
      failedGenerations: parseInt((data.failedGenerations as string) || "0", 10),
      totalCancelled: parseInt((data.totalCancelled as string) || "0", 10),
      avgDuration: totalGenerations > 0 ? Math.round(totalDuration / totalGenerations) : 0,
      avgQueueWait: totalGenerations > 0
        ? Math.round(parseInt((data.totalQueueWait as string) || "0", 10) / totalGenerations)
        : 0,
      totalTokens:
        parseInt((data.totalPromptTokens as string) || "0", 10) +
        parseInt((data.totalCompletionTokens as string) || "0", 10),
      totalRetries: parseInt((data.totalRetries as string) || "0", 10),
      successRate: totalGenerations > 0
        ? Math.round((successfulGenerations / totalGenerations) * 100)
        : 0,
    };
  }

  static async getProviderMetrics(provider: string): Promise<{
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    successRate: number;
    avgDuration: number;
  }> {
    const key = `ai:metrics:provider:${provider}`;
    const data = await redis.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      return { totalCalls: 0, successfulCalls: 0, failedCalls: 0, successRate: 0, avgDuration: 0 };
    }

    const totalCalls = parseInt((data.totalCalls as string) || "0", 10);
    const successfulCalls = parseInt((data.successfulCalls as string) || "0", 10);
    const totalDuration = parseInt((data.totalDuration as string) || "0", 10);

    return {
      totalCalls,
      successfulCalls,
      failedCalls: parseInt((data.failedCalls as string) || "0", 10),
      successRate: totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0,
      avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
    };
  }

  static async getDailyMetrics(days = 7): Promise<Array<{ date: string; total: number; successful: number; failed: number; avgDuration: number }>> {
    const result: Array<{ date: string; total: number; successful: number; failed: number; avgDuration: number }> = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const key = `ai:metrics:daily:${date}`;
      const data = await redis.hgetall(key);

      if (data && Object.keys(data).length > 0) {
        const total = parseInt((data.totalGenerations as string) || "0", 10);
        result.push({
          date,
          total,
          successful: parseInt((data.successful as string) || "0", 10),
          failed: parseInt((data.failed as string) || "0", 10),
          avgDuration: total > 0
            ? Math.round(parseInt((data.totalDuration as string) || "0", 10) / total)
            : 0,
        });
      } else {
        result.push({ date, total: 0, successful: 0, failed: 0, avgDuration: 0 });
      }
    }

    return result;
  }

  static async clearMetrics(): Promise<void> {
    const keys = await redis.keys("ai:metrics:*");
    if (keys.length > 0) await redis.del(...keys);
  }
}
