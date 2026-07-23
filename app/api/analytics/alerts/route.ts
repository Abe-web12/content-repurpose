export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { parseBody } from "@/lib/utils/api-errors";
import { requireAnalyticsAccess, getOrganizationId } from "@/lib/analytics/auth";
import { prisma } from "@/lib/prisma";
import { alertSchema } from "@/lib/validations/analytics";
import { AlertEngine } from "@/lib/analytics/alerts";
import { encodeCursor, decodeCursor } from "@/lib/utils/cursor-pagination";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = getOrganizationId(searchParams);
    const auth = await requireAnalyticsAccess(organizationId);

    const limitResult = await rateLimit(`analytics:alerts:${auth.userId}`, { windowMs: 60000, maxRequests: 60 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 25), 100);

    const alerts = await prisma.analyticsAlerts.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: decodeCursor(cursor) }, skip: 1 } : {}),
    });

    const hasMore = alerts.length > limit;
    const data = hasMore ? alerts.slice(0, limit) : alerts;

    const history = await AlertEngine.getAlertHistory(organizationId, 20);

    return NextResponse.json({
      data,
      history,
      nextCursor: hasMore ? encodeCursor(data[data.length - 1].id) : null,
      hasMore,
    });
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

    const limitResult = await rateLimit(`analytics:alerts:create:${auth.userId}`, { windowMs: 60000, maxRequests: 20 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const body = await parseBody(request);
    const data = alertSchema.parse(body);

    const alert = await prisma.analyticsAlerts.create({
      data: {
        organizationId,
        userId: auth.userId,
        name: data.name,
        description: data.description,
        metric: data.metric,
        condition: data.condition,
        threshold: data.threshold,
        window: data.window,
        channels: data.channels,
      },
    });

    return NextResponse.json({ data: alert }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
