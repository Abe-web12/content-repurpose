export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { BackgroundExecutor } from "@/lib/agents/background"

const MAX_JOBS_PER_RUN = 50

function isAuthorized(request: NextRequest): boolean {
  const secret =
    request.headers.get("x-cron-secret") ??
    request.nextUrl.searchParams.get("secret")
  return secret === process.env.CRON_SECRET
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let processed = 0
  const errors: string[] = []

  for (let i = 0; i < MAX_JOBS_PER_RUN; i++) {
    try {
      await BackgroundExecutor.processQueue()
      processed++
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      errors.push(msg)
    }
  }

  return NextResponse.json({ processed, errors: errors.length > 0 ? errors : undefined })
}
