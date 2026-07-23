export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { queryHandler } from "@/lib/api/shared-middleware";
import { WebPushManager } from "@/lib/notifications/web-push";

const GET = queryHandler({
  permission: "org:view",
  rateLimit: { windowMs: 60_000, maxRequests: 30 },
  name: "notifications.push.stats",
  handler: async (request, ctx) => {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "subscriptions";

    if (action === "stats") {
      const stats = await WebPushManager.getStats();
      return NextResponse.json({ data: stats });
    }

    if (action === "vapid") {
      return NextResponse.json({
        data: {
          vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "",
        },
      });
    }

    const subscriptions = await WebPushManager.getSubscriptions(ctx.userId);
    return NextResponse.json({
      data: {
        subscriptions: subscriptions.map((s) => ({
          id: s.id,
          deviceType: s.deviceType,
          userAgent: s.userAgent,
          createdAt: s.createdAt,
        })),
        total: subscriptions.length,
      },
    });
  },
});

export { GET };
