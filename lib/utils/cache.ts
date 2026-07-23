import { redis } from "@/lib/redis";

const DEFAULT_TTL = 300;

export async function cacheGet<T>(
  key: string,
  fetch: () => Promise<T>,
  ttl = DEFAULT_TTL
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      try {
        return JSON.parse(cached as string) as T;
      } catch {
        return cached as T;
      }
    }
  } catch {
  }

  const data = await fetch();

  try {
    await redis.set(key, JSON.stringify(data), { ex: ttl });
  } catch {
  }

  return data;
}

export async function cacheInvalidate(pattern: string): Promise<void> {
  try {
    let cursor = 0;
    const keysToDelete: string[] = [];
    do {
      const result = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = parseInt(result[0], 10);
      keysToDelete.push(...result[1]);
    } while (cursor !== 0);
    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
    }
  } catch {
  }
}

export function cacheKey(prefix: string, ...parts: (string | number | undefined | null)[]): string {
  return `cache:${prefix}:${parts.filter(Boolean).join(":")}`;
}
