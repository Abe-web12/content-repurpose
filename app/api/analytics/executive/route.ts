export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { requireAnalyticsAccess, getOrganizationId } from "@/lib/analytics/auth";
import { AnalyticsEngine } from "@/lib/analytics/engine";
import { RealtimeEngine } from "@/lib/analytics/realtime";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = getOrganizationId(searchParams);
    const auth = await requireAnalyticsAccess(organizationId);

    const limit = await rateLimit(`analytics:executive:${auth.userId}`, { windowMs: 60000, maxRequests: 60 });
    if (!limit.success) throw new AppError("Too many requests", 429);

    const [metrics, realtime] = await Promise.all([
      AnalyticsEngine.getExecutiveMetrics(organizationId),
      RealtimeEngine.getSnapshot(organizationId),
    ]);

    return NextResponse.json({ data: { metrics, realtime } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
