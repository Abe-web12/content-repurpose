export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { requireAnalyticsAccess, getOrganizationId } from "@/lib/analytics/auth";
import { BenchmarkEngine } from "@/lib/analytics/benchmarks";
import { benchmarkSchema } from "@/lib/validations/analytics";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = getOrganizationId(searchParams);
    await requireAnalyticsAccess(organizationId);

    const limitResult = await rateLimit(`analytics:benchmarks:${organizationId}`, { windowMs: 60000, maxRequests: 30 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const { metric, period, groupBy, name } = benchmarkSchema.parse({
      name: searchParams.get("name") ?? "default",
      metric: searchParams.get("metric") ?? "mrr",
      period: searchParams.get("period") ?? "monthly",
      groupBy: searchParams.get("groupBy") ?? undefined,
    });

    const result = await BenchmarkEngine.compare(organizationId, { metric, period, groupBy });
    return NextResponse.json({ data: result });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
