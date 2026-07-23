export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { checkAndSendUsageAlerts } from "@/lib/email/sender";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";
import { redis } from "@/lib/redis";

export async function GET(request: NextRequest) {
  try {
    const secret =
      request.headers.get("x-cron-secret") ||
      request.nextUrl.searchParams.get("secret");

    if (secret !== process.env.CRON_SECRET) {
      throw new AppError("Unauthorized", 401);
    }

    const rateKey = "cron:usage-alerts:last-run";
    const locked = await redis.set(rateKey, Date.now().toString(), {
      nx: true,
      ex: 3600,
    });

    if (locked !== "OK") {
      return NextResponse.json({ status: "skipped", reason: "Already ran within the last hour" });
    }

    const result = await checkAndSendUsageAlerts();
    return NextResponse.json({ status: "completed", ...result });
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
