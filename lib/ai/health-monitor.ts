import { redis } from "@/lib/redis";
import type { ProviderName } from "./orchestrator";

interface ProviderHealthRecord {
  status: "healthy" | "degraded" | "unhealthy" | "disabled";
  latency: number;
  errorRate: number;
  timeoutRate: number;
  successRate: number;
  totalCalls: number;
  consecutiveFailures: number;
  lastErrorAt: string | null;
  lastSuccessAt: string | null;
  disabledAt: string | null;
}

const HEALTHY_THRESHOLD_MS = 3000;
const DEGRADED_THRESHOLD_MS = 8000;
const MAX_CONSECUTIVE_FAILURES = 5;
const RECOVERY_COOLDOWN_MS = 60000;

function healthKey(provider: string): string {
  return `provider:health:${provider}`;
}

export class AiHealthMonitor {
  static async recordSuccess(provider: ProviderName, latency: number): Promise<void> {
    const key = healthKey(provider);
    const current = await redis.hgetall<Record<string, string | number | null>>(key);

    const totalCalls = ((current?.totalCalls as number | undefined) ?? 0) + 1;
    const avgLatency = current?.latency
      ? ((current.latency as number) * (totalCalls - 1) + latency) / totalCalls
      : latency;
    const consecutiveFailures = 0;
    const status = latency < HEALTHY_THRESHOLD_MS ? "healthy" : "degraded";

    await redis.hset(key, {
      status,
      latency: avgLatency,
      consecutiveFailures,
      totalCalls,
      lastSuccessAt: new Date().toISOString(),
      errorRate: Math.max(0, ((current?.errorRate as number | undefined) ?? 0) * 0.95),
      successRate: Math.min(100, ((current?.successRate as number | undefined) ?? 100) * 1.01),
    });
  }

  static async recordFailure(provider: ProviderName, error: string): Promise<void> {
    const key = healthKey(provider);
    const current = await redis.hgetall<Record<string, string | number | null>>(key);

    const totalCalls = ((current?.totalCalls as number | undefined) ?? 0) + 1;
    const consecutiveFailures = ((current?.consecutiveFailures as number | undefined) ?? 0) + 1;
    const errorRate = ((current?.errorRate as number | undefined) ?? 0) + 0.1;
    const successRate = Math.max(0, ((current?.successRate as number | undefined) ?? 100) * 0.95);

    let status: string;
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      status = "unhealthy";
    } else if (errorRate > 0.3) {
      status = "degraded";
    } else {
      status = current?.status as string ?? "healthy";
    }

    await redis.hset(key, {
      status,
      consecutiveFailures,
      totalCalls,
      lastErrorAt: new Date().toISOString(),
      errorRate,
      successRate,
    });
  }

  static async isProviderHealthy(provider: ProviderName): Promise<boolean> {
    const key = healthKey(provider);
    const current = await redis.hgetall<Record<string, string | number | null>>(key);
    if (!current) return true;
    return current.status !== "unhealthy" && current.status !== "disabled";
  }

  static async getProviderHealth(provider: string): Promise<ProviderHealthRecord | null> {
    const key = healthKey(provider);
    const data = await redis.hgetall<Record<string, string | number | null>>(key);
    if (!data) return null;
    return {
      status: (data.status as ProviderHealthRecord["status"]) ?? "healthy",
      latency: (data.latency as number) ?? 0,
      errorRate: (data.errorRate as number) ?? 0,
      timeoutRate: (data.timeoutRate as number) ?? 0,
      successRate: (data.successRate as number) ?? 100,
      totalCalls: (data.totalCalls as number) ?? 0,
      consecutiveFailures: (data.consecutiveFailures as number) ?? 0,
      lastErrorAt: (data.lastErrorAt as string) ?? null,
      lastSuccessAt: (data.lastSuccessAt as string) ?? null,
      disabledAt: (data.disabledAt as string) ?? null,
    };
  }

  static async getProviderScore(provider: string): Promise<number> {
    const key = healthKey(provider);
    const current = await redis.hgetall<Record<string, string | number | null>>(key);
    if (!current) return 100;

    const statusMultiplier =
      current.status === "healthy" ? 1.0
      : current.status === "degraded" ? 0.5
      : 0;

    const successScore = ((current.successRate as number) ?? 100) / 100;
    const latencyScore =
      ((current.latency as number) ?? 0) < HEALTHY_THRESHOLD_MS ? 1.0
      : ((current.latency as number) ?? 0) < DEGRADED_THRESHOLD_MS ? 0.6
      : 0.2;

    return statusMultiplier * (successScore * 0.6 + latencyScore * 0.4) * 100;
  }

  static async recoverProviders(): Promise<void> {
    const pattern = "provider:health:*";
    let cursor = "0";
    do {
      const scanResult = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = scanResult[0] as string;
      const keys = scanResult[1];

      for (const key of keys) {
        const current = await redis.hgetall<Record<string, string | number | null>>(key);
        if (!current) continue;

        if (
          current.status === "unhealthy" &&
          current.lastErrorAt &&
          Date.now() - new Date(current.lastErrorAt as string).getTime() > RECOVERY_COOLDOWN_MS
        ) {
          const providerName = key.replace("provider:health:", "");
          await redis.hset(key, {
            status: "degraded",
            consecutiveFailures: 0,
            errorRate: ((current.errorRate as number | undefined) ?? 0) * 0.5,
          });
        }
      }
    } while (cursor !== "0");
  }

  static async disableProvider(provider: string): Promise<void> {
    const key = healthKey(provider);
    await redis.hset(key, {
      status: "disabled",
      disabledAt: new Date().toISOString(),
    });
  }

  static async enableProvider(provider: string): Promise<void> {
    const key = healthKey(provider);
    await redis.hset(key, {
      status: "healthy",
      consecutiveFailures: 0,
      errorRate: 0,
      successRate: 100,
      disabledAt: null,
    });
  }

  static async resetProvider(provider: string): Promise<void> {
    const key = healthKey(provider);
    await redis.del(key);
  }

  static async getAllProviderHealth(): Promise<
    Array<{ provider: string; health: ProviderHealthRecord | null }>
  > {
    const providers: Array<{ provider: string; health: ProviderHealthRecord | null }> = [];
    const pattern = "provider:health:*";
    let cursor = "0";
    do {
      const scanResult = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = scanResult[0] as string;
      for (const key of scanResult[1]) {
        const provider = key.replace("provider:health:", "");
        const health = await this.getProviderHealth(provider);
        providers.push({ provider, health });
      }
    } while (cursor !== "0");
    return providers;
  }
}
