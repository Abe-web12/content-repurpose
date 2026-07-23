export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { requireAnalyticsAccess, getOrganizationId } from "@/lib/analytics/auth";
import { AnalyticsEngine } from "@/lib/analytics/engine";
import { analyticsPeriodSchema } from "@/lib/validations/analytics";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = getOrganizationId(searchParams);
    await requireAnalyticsAccess(organizationId);

    const limit = await rateLimit(`analytics:revenue:${organizationId}`, { windowMs: 60000, maxRequests: 60 });
    if (!limit.success) throw new AppError("Too many requests", 429);

    const { period } = analyticsPeriodSchema.parse({
      period: searchParams.get("period") ?? "30d",
    });
    const days = period === "7d" ? 7 : period === "90d" ? 90 : period === "365d" ? 365 : 30;

    const [revenue, executive] = await Promise.all([
      AnalyticsEngine.getRevenueData(organizationId, days),
      AnalyticsEngine.getExecutiveMetrics(organizationId),
    ]);

    return NextResponse.json({ data: { revenue, metrics: executive } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
