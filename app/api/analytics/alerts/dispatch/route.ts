export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { parseBody } from "@/lib/utils/api-errors";
import { requireAnalyticsAccess, getOrganizationId } from "@/lib/analytics/auth";
import { prisma } from "@/lib/prisma";
import { AlertDispatcher } from "@/lib/analytics/alert-dispatch";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = getOrganizationId(searchParams);
    const auth = await requireAnalyticsAccess(organizationId);

    const limitResult = await rateLimit(`analytics:dispatch:${auth.userId}`, { windowMs: 60000, maxRequests: 60 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const alertId = searchParams.get("alertId");
    if (alertId) {
      const status = await AlertDispatcher.getDispatchStatus(alertId);
      return NextResponse.json({ data: status });
    }

    const limit = Math.min(Number(searchParams.get("limit") ?? 25), 100);
    const events = await prisma.analyticsAlertEvents.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const alertIds = [...new Set(events.map((e) => e.alertId))];
    const alerts = await prisma.analyticsAlerts.findMany({
      where: { id: { in: alertIds } },
      select: { id: true, name: true, metric: true, channels: true },
    });
    const alertMap = new Map(alerts.map((a) => [a.id, a]));

    return NextResponse.json({
      data: events.map((e) => ({
        id: e.id,
        alertName: alertMap.get(e.alertId)?.name ?? "Unknown",
        metric: e.metric,
        value: e.value,
        threshold: e.threshold,
        condition: e.condition,
        message: e.message,
        status: e.status,
        channels: alertMap.get(e.alertId)?.channels ?? [],
        triggeredAt: e.createdAt,
        acknowledgedAt: e.acknowledgedAt,
        resolvedAt: e.resolvedAt,
      })),
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
    const auth = await requireAnalyticsAccess(organizationId, "edit");

    const limitResult = await rateLimit(`analytics:dispatch:create:${auth.userId}`, { windowMs: 60000, maxRequests: 10 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const body = await parseBody(request);
    const { action, alertId, eventId, channel } = body as {
      action?: string;
      alertId?: string;
      eventId?: string;
      channel?: string;
    };

    if (action === "retry") {
      if (!alertId) throw new AppError("alertId is required", 400);

      const alert = await prisma.analyticsAlerts.findUnique({
        where: { id: alertId, organizationId },
      });
      if (!alert) throw new AppError("Alert not found", 404);

      const events = await prisma.analyticsAlertEvents.findMany({
        where: { alertId, status: { in: ["triggered", "retry_pending_email", "retry_pending_webhook", "retry_pending_slack", "retry_pending_discord"] } },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      let retried = 0;
      for (const event of events) {
        try {
          await AlertDispatcher.dispatchAlert(
            alert,
            {
              id: event.id,
              value: event.value,
              threshold: event.threshold,
              condition: event.condition,
              message: event.message,
              createdAt: event.createdAt,
            }
          );
          retried++;
        } catch {}
      }

      return NextResponse.json({ data: { retried } });
    }

    if (action === "test") {
      if (!channel) throw new AppError("channel is required (email, webhook, slack, discord)", 400);

      const alert = await prisma.analyticsAlerts.findFirst({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
      });

      const testEvent = {
        id: "test",
        organizationId,
        value: 100,
        threshold: 80,
        condition: "gt" as const,
        message: "Test dispatch message",
        createdAt: new Date(),
      };

      const testAlert = {
        id: alert?.id ?? "test",
        organizationId,
        name: alert?.name ?? "Test Alert",
        metric: alert?.metric ?? "test_metric",
        channels: [channel],
      };

      await AlertDispatcher.dispatchAlert(testAlert, testEvent);
      return NextResponse.json({ data: { sent: true, channel } });
    }

    throw new AppError("Unknown action", 400);
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
