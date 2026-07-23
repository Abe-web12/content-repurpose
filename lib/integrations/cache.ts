import { redis } from "@/lib/redis";

const CACHE_PREFIX = "integration:";
const DEFAULT_TTL = 300;

export class IntegrationCache {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await redis.get(`${CACHE_PREFIX}${key}`);
      return raw ? JSON.parse(raw as string) : null;
    } catch {
      return null;
    }
  }

  static async set(key: string, value: unknown, ttl = DEFAULT_TTL): Promise<void> {
    try {
      await redis.setex(`${CACHE_PREFIX}${key}`, ttl, JSON.stringify(value));
    } catch {}
  }

  static async del(key: string): Promise<void> {
    try {
      await redis.del(`${CACHE_PREFIX}${key}`);
    } catch {}
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(`${CACHE_PREFIX}${pattern}`);
      if (keys.length > 0) await redis.del(...keys);
    } catch {}
  }

  static async getOrSet<T>(key: string, fetch: () => Promise<T>, ttl = DEFAULT_TTL): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await fetch();
    await this.set(key, value, ttl);
    return value;
  }
}
