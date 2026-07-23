import { Redis } from "@upstash/redis"

function getRedisEnv(): { url: string; token: string } | null {
  const url = process.env.REDIS_URL
  const token = process.env.REDIS_TOKEN
  if (!url || !token) return null
  return { url, token }
}

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

const env = getRedisEnv()

export const redis: Redis =
  globalForRedis.redis ??
  (env
    ? new Redis({ url: env.url, token: env.token })
    : (new Proxy({} as Redis, {
        get() {
          const noop = () =>
            Promise.resolve(undefined) as unknown as Promise<never>
          return noop
        },
      }) as Redis))

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis
}
