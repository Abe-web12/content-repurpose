export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";
import { requireAnalyticsAccess } from "@/lib/analytics/auth";
import { prisma } from "@/lib/prisma";
import { AlertEngine } from "@/lib/analytics/alerts";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const event = await prisma.analyticsAlertEvents.findUnique({ where: { id } });
    if (!event) throw new AppError("Alert event not found", 404);
    await requireAnalyticsAccess(event.organizationId);
    return NextResponse.json({ data: event });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const event = await prisma.analyticsAlertEvents.findUnique({ where: { id } });
    if (!event) throw new AppError("Alert event not found", 404);
    await requireAnalyticsAccess(event.organizationId);

    const action = new URL(request.url).searchParams.get("action");
    if (action === "acknowledge") {
      await AlertEngine.acknowledgeAlert(id);
    } else if (action === "resolve") {
      await AlertEngine.resolveAlert(id);
    } else {
      throw new AppError("Invalid action", 400);
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
