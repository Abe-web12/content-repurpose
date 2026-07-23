import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

interface ProviderHealthRecord {
  status: "healthy" | "degraded" | "unhealthy" | "disabled";
  latency: number;
  errorRate: number;
  timeoutRate: number;
  successRate: number;
  totalCalls: number;
  lastLatency: number | null;
  lastErrorAt: string | null;
  lastSuccessAt: string | null;
  consecutiveFailures: number;
}

export class AIHealthMonitor {
  private static healthKey(provider: string) {
    return `ai:health:${provider}`;
  }

  static async recordSuccess(provider: string, latency: number): Promise<void> {
    const key = this.healthKey(provider);
    const pipeline = redis.pipeline();

    pipeline.hincrby(key, "totalCalls", 1);
    pipeline.hset(key, { lastLatency: latency });
    pipeline.hset(key, { lastSuccessAt: new Date().toISOString() });
    pipeline.hset(key, { consecutiveFailures: 0 });

    const currentLatency = await redis.hget<string>(key, "latency");
    const callsStr = await redis.hget<string>(key, "totalCalls");
    const calls = parseInt(callsStr || "0");
    const avgLatency = currentLatency
      ? (parseFloat(currentLatency) * 0.9 + latency * 0.1).toFixed(2)
      : latency.toFixed(2);

    pipeline.hset(key, { latency: avgLatency });
    pipeline.expire(key, 86400);

    await pipeline.exec();

    await prisma.providerHealth.upsert({
      where: { provider },
      update: {
        latency: parseFloat(avgLatency),
        totalCalls: { increment: 1 },
        lastLatency: latency,
        lastSuccessAt: new Date(),
        consecutiveFailures: 0,
        successRate: { increment: 0.1 },
        status: "HEALTHY",
      },
      create: {
        provider,
        status: "HEALTHY",
        latency: parseFloat(avgLatency),
        totalCalls: 1,
        lastLatency: latency,
        lastSuccessAt: new Date(),
        successRate: 100,
      },
    });
  }

  static async recordFailure(provider: string, _error: string): Promise<void> {
    const key = this.healthKey(provider);

    const pipeline = redis.pipeline();
    pipeline.hincrby(key, "totalCalls", 1);
    pipeline.hset(key, { lastErrorAt: new Date().toISOString() });
    pipeline.hincrby(key, "consecutiveFailures", 1);

    const consecutiveStr = await redis.hget<string>(key, "consecutiveFailures");
    const consecutive = parseInt(consecutiveStr || "0") + 1;

    const status = consecutive >= 5 ? "unhealthy" : consecutive >= 3 ? "degraded" : "healthy";
    pipeline.hset(key, { status });
    pipeline.expire(key, 86400);

    await pipeline.exec();

    await prisma.providerHealth.upsert({
      where: { provider },
      update: {
        totalCalls: { increment: 1 },
        lastErrorAt: new Date(),
        consecutiveFailures: consecutive,
        status: status.toUpperCase() as any,
        errorRate: consecutive > 0 ? Math.min(consecutive * 5, 100) : 0,
      },
      create: {
        provider,
        status: status.toUpperCase() as any,
        totalCalls: 1,
        lastErrorAt: new Date(),
        consecutiveFailures: consecutive,
        errorRate: consecutive > 0 ? Math.min(consecutive * 5, 100) : 0,
        successRate: 100,
      },
    });
  }

  static async getProviderHealth(provider: string): Promise<ProviderHealthRecord | null> {
    const key = this.healthKey(provider);
    const data = await redis.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      const dbHealth = await prisma.providerHealth.findUnique({ where: { provider } });
      if (!dbHealth) return null;

      return {
        status: dbHealth.status.toLowerCase() as any,
        latency: dbHealth.latency,
        errorRate: dbHealth.errorRate,
        timeoutRate: dbHealth.timeoutRate,
        successRate: dbHealth.successRate,
        totalCalls: dbHealth.totalCalls,
        lastLatency: dbHealth.lastLatency,
        lastErrorAt: dbHealth.lastErrorAt?.toISOString() ?? null,
        lastSuccessAt: dbHealth.lastSuccessAt?.toISOString() ?? null,
        consecutiveFailures: dbHealth.consecutiveFailures,
      };
    }

    return {
      status: (data.status as any) || "healthy",
      latency: parseFloat(data.latency as string) || 0,
      errorRate: parseFloat(data.errorRate as string) || 0,
      timeoutRate: parseFloat(data.timeoutRate as string) || 0,
      successRate: parseFloat(data.successRate as string) || 100,
      totalCalls: parseInt(data.totalCalls as string) || 0,
      lastLatency: data.lastLatency ? parseFloat(data.lastLatency as string) : null,
      lastErrorAt: (data.lastErrorAt as string) || null,
      lastSuccessAt: (data.lastSuccessAt as string) || null,
      consecutiveFailures: parseInt(data.consecutiveFailures as string) || 0,
    };
  }

  static async isProviderHealthy(provider: string): Promise<boolean> {
    const health = await this.getProviderHealth(provider);
    if (!health) return true;
    return health.status === "healthy" || health.status === "degraded";
  }

  static async getAllProviderHealth(): Promise<Array<{ provider: string; health: ProviderHealthRecord }>> {
    const keys = await redis.keys("ai:health:*");
    const results: Array<{ provider: string; health: ProviderHealthRecord }> = [];

    for (const key of keys) {
      const provider = key.replace("ai:health:", "");
      const health = await this.getProviderHealth(provider);
      if (health) results.push({ provider, health });
    }

    const dbHealth = await prisma.providerHealth.findMany();
    const existingProviders = new Set(results.map((r) => r.provider));

    for (const h of dbHealth) {
      if (!existingProviders.has(h.provider)) {
        results.push({
          provider: h.provider,
          health: {
            status: h.status.toLowerCase() as any,
            latency: h.latency,
            errorRate: h.errorRate,
            timeoutRate: h.timeoutRate,
            successRate: h.successRate,
            totalCalls: h.totalCalls,
            lastLatency: h.lastLatency,
            lastErrorAt: h.lastErrorAt?.toISOString() ?? null,
            lastSuccessAt: h.lastSuccessAt?.toISOString() ?? null,
            consecutiveFailures: h.consecutiveFailures,
          },
        });
      }
    }

    return results;
  }

  static async getProviderScore(provider: string): Promise<number> {
    const health = await this.getProviderHealth(provider);
    if (!health) return 50;

    let score = 100;
    if (health.status === "disabled") return 0;
    if (health.status === "unhealthy") return 0;
    if (health.status === "degraded") score -= 30;
    score -= health.errorRate;
    if (health.latency > 5000) score -= 20;
    else if (health.latency > 2000) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  static async disableProvider(provider: string): Promise<void> {
    const key = this.healthKey(provider);
    await redis.hset(key, { status: "disabled" });
    await prisma.providerHealth.upsert({
      where: { provider },
      update: { status: "DISABLED" },
      create: { provider, status: "DISABLED" },
    });
  }

  static async enableProvider(provider: string): Promise<void> {
    const key = this.healthKey(provider);
    await redis.hset(key, { status: "healthy" });
    await prisma.providerHealth.upsert({
      where: { provider },
      update: { status: "HEALTHY", consecutiveFailures: 0 },
      create: { provider, status: "HEALTHY" },
    });
  }

  static async resetProvider(provider: string): Promise<void> {
    const key = this.healthKey(provider);
    await redis.del(key);
    await prisma.providerHealth.update({
      where: { provider },
      data: {
        status: "HEALTHY",
        latency: 0,
        errorRate: 0,
        timeoutRate: 0,
        successRate: 100,
        consecutiveFailures: 0,
        lastErrorAt: null,
      },
    });
  }
}
