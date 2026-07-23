import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import webpush from "web-push";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:notifications@repurposeai.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  renotify?: boolean;
  timestamp?: number;
  vibrate?: number[];
  dir?: "auto" | "ltr" | "rtl";
  lang?: string;
}

async function sendPushNotification(
  subscription: WebPushSubscription,
  payload: WebPushPayload
): Promise<boolean> {
  try {
    const result = await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      JSON.stringify({
        ...payload,
        data: {
          ...payload.data,
          timestamp: payload.timestamp ?? Date.now(),
        },
      }),
      {
        TTL: 86400,
        urgency: payload.silent ? "low" : "high",
        vapidDetails: {
          subject: VAPID_SUBJECT,
          publicKey: VAPID_PUBLIC_KEY,
          privateKey: VAPID_PRIVATE_KEY,
        },
      }
    );

    return result.statusCode >= 200 && result.statusCode < 300;
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      return false;
    }
    return false;
  }
}

export class WebPushManager {
  static async subscribe(
    userId: string,
    organizationId: string,
    subscription: WebPushSubscription,
    deviceType?: string,
    userAgent?: string
  ) {
    const existing = await prisma.pushSubscriptions.findUnique({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      return prisma.pushSubscriptions.update({
        where: { id: existing.id },
        data: { isActive: true, deviceType, userAgent },
      });
    }

    return prisma.pushSubscriptions.create({
      data: {
        userId,
        organizationId,
        endpoint: subscription.endpoint,
        p256dhKey: subscription.keys.p256dh,
        authKey: subscription.keys.auth,
        deviceType,
        userAgent,
        isActive: true,
      },
    });
  }

  static async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await prisma.pushSubscriptions.updateMany({
      where: { userId, endpoint, isActive: true },
      data: { isActive: false },
    });
  }

  static async removeSubscription(userId: string, subscriptionId: string): Promise<void> {
    await prisma.pushSubscriptions.deleteMany({
      where: { id: subscriptionId, userId },
    });
  }

  static async getSubscriptions(userId: string) {
    return prisma.pushSubscriptions.findMany({
      where: { userId, isActive: true },
    });
  }

  static async getOrgSubscriptions(organizationId: string) {
    return prisma.pushSubscriptions.findMany({
      where: { organizationId, isActive: true },
    });
  }

  static async sendToUser(
    userId: string,
    payload: WebPushPayload
  ): Promise<{ sent: number; failed: number }> {
    const subscriptions = await prisma.pushSubscriptions.findMany({
      where: { userId, isActive: true },
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      const success = await sendPushNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dhKey, auth: sub.authKey },
        },
        payload
      );

      if (success) {
        sent++;
      } else {
        failed++;
        await prisma.pushSubscriptions.update({
          where: { id: sub.id },
          data: { isActive: false },
        });
      }
    }

    return { sent, failed };
  }

  static async sendToOrganization(
    organizationId: string,
    payload: WebPushPayload
  ): Promise<{ sent: number; failed: number }> {
    const subscriptions = await prisma.pushSubscriptions.findMany({
      where: { organizationId, isActive: true },
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      const success = await sendPushNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dhKey, auth: sub.authKey },
        },
        payload
      );

      if (success) {
        sent++;
      } else {
        failed++;
        await prisma.pushSubscriptions.update({
          where: { id: sub.id },
          data: { isActive: false },
        });
      }
    }

    return { sent, failed };
  }

  static async sendToAll(
    payload: WebPushPayload
  ): Promise<{ sent: number; failed: number }> {
    const subscriptions = await prisma.pushSubscriptions.findMany({
      where: { isActive: true },
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      const success = await sendPushNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dhKey, auth: sub.authKey },
        },
        payload
      );

      if (success) {
        sent++;
      } else {
        failed++;
        await prisma.pushSubscriptions.update({
          where: { id: sub.id },
          data: { isActive: false },
        });
      }
    }

    return { sent, failed };
  }

  static async sendScheduledNotification(
    userId: string,
    payload: WebPushPayload,
    delayMs: number
  ): Promise<void> {
    setTimeout(async () => {
      await WebPushManager.sendToUser(userId, payload).catch(() => {});
    }, delayMs);
  }

  static async sendSilentNotification(
    userId: string,
    data: Record<string, unknown>
  ): Promise<{ sent: number; failed: number }> {
    return WebPushManager.sendToUser(userId, {
      title: "",
      body: "",
      silent: true,
      data,
    });
  }

  static async cleanupExpired(): Promise<number> {
    const result = await prisma.pushSubscriptions.deleteMany({
      where: { isActive: false },
    });

    return result.count;
  }

  static async getStats(): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    uniqueUsers: number;
  }> {
    const [totalSubscriptions, activeSubscriptions, uniqueUsers] =
      await Promise.all([
        prisma.pushSubscriptions.count(),
        prisma.pushSubscriptions.count({ where: { isActive: true } }),
        prisma.pushSubscriptions.groupBy({
          by: ["userId"],
          where: { isActive: true },
          _count: { userId: true },
        }).then((groups) => groups.length),
      ]);

    return { totalSubscriptions, activeSubscriptions, uniqueUsers };
  }
}
