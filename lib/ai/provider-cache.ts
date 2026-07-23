import { redis } from "@/lib/redis";
import { createHash } from "crypto";

const CACHE_PREFIX = "ai:response:";
const DEFAULT_TTL = 3600;

export class AIResponseCache {
  static buildKey(
    provider: string,
    model: string,
    messages: Array<{ role: string; content: string }>,
    temperature?: number
  ): string {
    const input = JSON.stringify({ provider, model, messages, temperature });
    return `${CACHE_PREFIX}${createHash("sha256").update(input).digest("hex")}`;
  }

  static async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await redis.get(key);
      return raw ? JSON.parse(raw as string) : null;
    } catch {
      return null;
    }
  }

  static async set(key: string, value: unknown, ttl = DEFAULT_TTL): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch {}
  }

  static async invalidate(provider?: string): Promise<void> {
    try {
      const pattern = provider ? `${CACHE_PREFIX}${provider}:*` : `${CACHE_PREFIX}*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
    } catch {}
  }
}
