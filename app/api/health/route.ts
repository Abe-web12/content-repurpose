export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "REDIS_URL",
  "REDIS_TOKEN",
  "CRON_SECRET",
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "RESEND_API_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "AI_API_KEY",
  "AI_BASE_URL",
  "AI_MODEL",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_APP_NAME",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "ENCRYPTION_KEY",
] as const

interface CheckResult {
  status: "ok" | "fail"
  message?: string
}

async function checkDatabase(): Promise<CheckResult> {
  try {
    await prisma.$queryRawUnsafe("SELECT 1")
    return { status: "ok" }
  } catch (error) {
    return {
      status: "fail",
      message: error instanceof Error ? error.message : "Database connection failed",
    }
  }
}

async function checkRedis(): Promise<CheckResult> {
  try {
    const pong = await redis.ping()
    if (pong !== "PONG") {
      return { status: "fail", message: "Unexpected Redis ping response" }
    }
    return { status: "ok" }
  } catch (error) {
    return {
      status: "fail",
      message: error instanceof Error ? error.message : "Redis connection failed",
    }
  }
}

function checkEnvVars(): CheckResult {
  const missing: string[] = []

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    return {
      status: "fail",
      message: `Missing environment variables: ${missing.join(", ")}`,
    }
  }

  return { status: "ok" }
}

export async function GET() {
  const [db, kv, env] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkEnvVars(),
  ])

  const checks = { database: db, redis: kv, environment: env }
  const allOk = Object.values(checks).every((c) => c.status === "ok")

  return NextResponse.json(
    {
      status: allOk ? "ok" : "fail",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      name: "RepurposeAI",
      checks,
    },
    { status: allOk ? 200 : 500 }
  )
}
