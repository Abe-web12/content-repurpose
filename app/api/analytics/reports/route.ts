export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { parseBody } from "@/lib/utils/api-errors";
import { requireAnalyticsAccess, getOrganizationId } from "@/lib/analytics/auth";
import { prisma } from "@/lib/prisma";
import { reportSchema } from "@/lib/validations/analytics";
import { encodeCursor, decodeCursor } from "@/lib/utils/cursor-pagination";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = getOrganizationId(searchParams);
    const auth = await requireAnalyticsAccess(organizationId);

    const limitResult = await rateLimit(`analytics:reports:${auth.userId}`, { windowMs: 60000, maxRequests: 60 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 25), 100);

    const reports = await prisma.analyticsReports.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: decodeCursor(cursor) }, skip: 1 } : {}),
    });

    const hasMore = reports.length > limit;
    const data = hasMore ? reports.slice(0, limit) : reports;
    const nextCursor = hasMore ? encodeCursor(data[data.length - 1].id) : null;

    return NextResponse.json({ data, nextCursor, hasMore });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = getOrganizationId(searchParams);
    const auth = await requireAnalyticsAccess(organizationId);

    const limitResult = await rateLimit(`analytics:reports:create:${auth.userId}`, { windowMs: 60000, maxRequests: 20 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const body = await parseBody(request);
    const data = reportSchema.parse(body);

    const report = await prisma.analyticsReports.create({
      data: {
        organizationId,
        userId: auth.userId,
        title: data.title,
        description: data.description,
        type: data.type,
        config: (data.config ?? {}) as object,
        filters: (data.filters ?? {}) as object,
        format: data.format ?? "pdf",
      },
    });

    return NextResponse.json({ data: report }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
