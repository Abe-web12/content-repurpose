export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { requireAnalyticsAccess, getOrganizationId } from "@/lib/analytics/auth";
import { PredictionEngine } from "@/lib/analytics/predictions";
import { predictionSchema } from "@/lib/validations/analytics";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = getOrganizationId(searchParams);
    await requireAnalyticsAccess(organizationId);

    const limit = await rateLimit(`analytics:predictions:${organizationId}`, { windowMs: 60000, maxRequests: 30 });
    if (!limit.success) throw new AppError("Too many requests", 429);

    const { metric, days, period } = predictionSchema.parse({
      metric: searchParams.get("metric") ?? "mrr",
      days: searchParams.get("days") ?? "30",
      period: searchParams.get("period") ?? "90d",
    });

    const result = await PredictionEngine.forecast({
      organizationId,
      metric,
      days: Number(days),
      period: Number(period.replace("d", "")),
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
