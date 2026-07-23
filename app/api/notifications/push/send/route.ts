export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { mutationHandler } from "@/lib/api/shared-middleware";
import { WebPushManager } from "@/lib/notifications/web-push";
import { FCMService } from "@/lib/notifications/fcm";
import { AppError } from "@/lib/utils/api-errors";

const POST = mutationHandler({
  permission: "org:edit",
  rateLimit: { windowMs: 60_000, maxRequests: 30 },
  name: "notifications.push.send",
  handler: async (request, ctx, body: any) => {
    const { title, body: messageBody, data, scope, silent, scheduledAt, userId, fcmTokens, topic } = body as {
      title: string;
      body?: string;
      data?: Record<string, unknown>;
      scope?: "user" | "organization" | "all" | "specific" | "topic";
      silent?: boolean;
      scheduledAt?: string;
      userId?: string;
      fcmTokens?: string[];
      topic?: string;
    };

    if (!title && !silent) {
      throw new AppError("title is required for non-silent notifications", 400);
    }

    const payload = {
      title,
      body: body?.body || "",
      data,
      silent,
    };

    if (scheduledAt) {
      const delay = new Date(scheduledAt).getTime() - Date.now();
      if (delay <= 0) throw new AppError("scheduledAt must be in the future", 400);

      if (scope === "user" || !scope) {
        await WebPushManager.sendScheduledNotification(ctx.userId, payload as any, delay);
      }
      return NextResponse.json({ data: { scheduled: true, deliverAt: scheduledAt } });
    }

    if (silent && data) {
      const result = await WebPushManager.sendSilentNotification(ctx.userId, data);
      return NextResponse.json({ data: result });
    }

    if (scope === "user" || !scope) {
      const targetUser = userId || ctx.userId;
      const [webPushResult, fcmResult] = await Promise.all([
        WebPushManager.sendToUser(targetUser, payload as any),
        FCMService.sendToOrganization(ctx.orgId!, { title, body: body?.body || "", data: data as Record<string, string> | undefined, silent }),
      ]);

      return NextResponse.json({
        data: {
          webPush: webPushResult,
          fcm: fcmResult,
        },
      });
    }

    if (scope === "organization") {
      const [webPushResult, fcmResult] = await Promise.all([
        WebPushManager.sendToOrganization(ctx.orgId!, payload as any),
        FCMService.sendToOrganization(ctx.orgId!, { title, body: body?.body || "", data: data as Record<string, string> | undefined, silent }),
      ]);

      return NextResponse.json({
        data: {
          webPush: webPushResult,
          fcm: fcmResult,
        },
      });
    }

    if (scope === "specific") {
      if (fcmTokens && fcmTokens.length > 0) {
        const fcmResult = await FCMService.sendToMultiple(fcmTokens, {
          title,
          body: body?.body || "",
          data: data as Record<string, string> | undefined,
          silent,
        });
        return NextResponse.json({ data: { fcm: fcmResult } });
      }
      throw new AppError("fcmTokens required for specific scope", 400);
    }

    if (scope === "topic" && topic) {
      const result = await FCMService.sendToTopic(topic, {
        title,
        body: body?.body || "",
        data: data as Record<string, string> | undefined,
      });
      return NextResponse.json({ data: result });
    }

    if (scope === "all") {
      const result = await WebPushManager.sendToAll(payload as any);
      return NextResponse.json({ data: result });
    }

    throw new AppError(`Unknown scope: ${scope}`, 400);
  },
});

export { POST };
