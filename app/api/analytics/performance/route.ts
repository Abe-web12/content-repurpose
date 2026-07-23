export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { requireAnalyticsAccess, getOrganizationId } from "@/lib/analytics/auth";
import { PerformanceAnalytics } from "@/lib/analytics/performance";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = getOrganizationId(searchParams);
    await requireAnalyticsAccess(organizationId);

    const limit = await rateLimit(`analytics:performance:${organizationId}`, { windowMs: 60000, maxRequests: 60 });
    if (!limit.success) throw new AppError("Too many requests", 429);

    const minutes = Math.min(Number(searchParams.get("minutes") ?? 60), 1440);
    const [metrics, series] = await Promise.all([
      PerformanceAnalytics.getMetrics(organizationId),
      PerformanceAnalytics.getTimeSeries(organizationId, minutes),
    ]);

    return NextResponse.json({ data: { metrics, series } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
