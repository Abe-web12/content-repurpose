export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { queryHandler, mutationHandler } from "@/lib/api/shared-middleware";
import { WebPushManager } from "@/lib/notifications/web-push";
import { FCMService } from "@/lib/notifications/fcm";
import { AppError, parseBody, sanitizeError } from "@/lib/utils/api-errors";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { rateLimit } from "@/lib/utils/rate-limit";

const GET = queryHandler({
  permission: "org:view",
  rateLimit: { windowMs: 60_000, maxRequests: 30 },
  name: "notifications.push.subscribe.get",
  handler: async (request, ctx) => {
    const subscriptions = await WebPushManager.getSubscriptions(ctx.userId);
    const fcmTokens = await FCMService.getUserTokens(ctx.userId);

    return NextResponse.json({
      data: {
        webPush: subscriptions.map((s) => ({
          id: s.id,
          deviceType: s.deviceType,
          userAgent: s.userAgent,
          createdAt: s.createdAt,
        })),
        fcmTokens,
      },
    });
  },
});

const POST = mutationHandler({
  permission: "org:edit",
  rateLimit: { windowMs: 60_000, maxRequests: 20 },
  name: "notifications.push.subscribe.post",
  handler: async (request, ctx, body: any) => {
    const { endpoint, keys, deviceType, userAgent, fcmToken, type } = body as {
      endpoint?: string;
      keys?: { p256dh: string; auth: string };
      deviceType?: string;
      userAgent?: string;
      fcmToken?: string;
      type?: "webpush" | "fcm";
    };

    if (type === "fcm" && fcmToken) {
      await FCMService.registerToken(ctx.userId, ctx.orgId!, fcmToken);
      return NextResponse.json({ data: { registered: true, type: "fcm" } });
    }

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new AppError("endpoint, keys.p256dh, and keys.auth are required for web push", 400);
    }

    const subscription = await WebPushManager.subscribe(
      ctx.userId,
      ctx.orgId!,
      { endpoint, keys },
      deviceType,
      userAgent
    );

    return NextResponse.json({ data: { id: subscription.id, registered: true, type: "webpush" } }, { status: 201 });
  },
});

const DELETE = mutationHandler({
  permission: "org:edit",
  rateLimit: { windowMs: 60_000, maxRequests: 20 },
  name: "notifications.push.subscribe.delete",
  handler: async (request, ctx, body: any) => {
    const { endpoint, subscriptionId, fcmToken, type } = body as {
      endpoint?: string;
      subscriptionId?: string;
      fcmToken?: string;
      type?: "webpush" | "fcm";
    };

    if (type === "fcm" && fcmToken) {
      await FCMService.unregisterToken(ctx.userId, ctx.orgId!, fcmToken);
      return NextResponse.json({ data: { unregistered: true } });
    }

    if (subscriptionId) {
      await WebPushManager.removeSubscription(ctx.userId, subscriptionId);
      return NextResponse.json({ data: { removed: true } });
    }

    if (endpoint) {
      await WebPushManager.unsubscribe(ctx.userId, endpoint);
      return NextResponse.json({ data: { unsubscribed: true } });
    }

    throw new AppError("Provide endpoint, subscriptionId, or fcmToken to unsubscribe", 400);
  },
});

export { GET, POST, DELETE };
