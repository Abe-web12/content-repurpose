import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

const FCM_PROJECT_ID = process.env.FCM_PROJECT_ID || "";
const FCM_SERVICE_ACCOUNT = process.env.FCM_SERVICE_ACCOUNT || "";
const FCM_BASE_URL = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`;

interface FcmMessage {
  token?: string;
  topic?: string;
  condition?: string;
  notification?: {
    title: string;
    body: string;
    image?: string;
  };
  data?: Record<string, string>;
  android?: {
    priority?: "normal" | "high";
    ttl?: string;
    notification?: {
      channelId?: string;
      sound?: string;
      priority?: "default" | "min" | "low" | "high" | "max";
      clickAction?: string;
      tag?: string;
      sticky?: boolean;
      eventTime?: string;
      localOnly?: boolean;
      notificationCount?: number;
      defaultSound?: boolean;
      defaultVibrateTimings?: boolean;
      defaultLightSettings?: boolean;
      vibrateTimings?: string[];
      visibility?: "private" | "public" | "secret";
      notificationPriority?: "PRIORITY_DEFAULT" | "PRIORITY_LOW" | "PRIORITY_HIGH" | "PRIORITY_MAX";
    };
  };
  apns?: {
    headers?: Record<string, string>;
    payload?: {
      aps: {
        alert?: { title?: string; body?: string };
        badge?: number;
        sound?: string;
        contentAvailable?: boolean;
        mutableContent?: boolean;
        category?: string;
        threadId?: string;
      };
    };
  };
  webpush?: {
    headers?: Record<string, string>;
    data?: Record<string, string>;
    notification?: {
      title?: string;
      body?: string;
      icon?: string;
      badge?: string;
      image?: string;
      tag?: string;
      data?: Record<string, unknown>;
      actions?: Array<{ action: string; title: string; icon?: string }>;
      requireInteraction?: boolean;
      silent?: boolean;
      renotify?: boolean;
      timestamp?: number;
      vibrate?: number[];
      dir?: "auto" | "ltr" | "rtl";
      lang?: string;
    };
    fcmOptions?: {
      link?: string;
      analyticsLabel?: string;
    };
  };
}

interface FcmSendResult {
  success: boolean;
  name?: string;
  error?: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  try {
    const serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT);
    const { client_email, private_key } = serviceAccount;

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const claimSet = {
      iss: client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    const encoder = new TextEncoder();
    const base64url = (buf: ArrayBuffer): string =>
      btoa(String.fromCharCode(...new Uint8Array(buf)))
        .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

    const headerEncoded = base64url(encoder.encode(JSON.stringify(header)).buffer);
    const claimEncoded = base64url(encoder.encode(JSON.stringify(claimSet)).buffer);
    const toSign = `${headerEncoded}.${claimEncoded}`;

    const { createPrivateKey, sign } = await import("crypto");
    const key = createPrivateKey({ key: private_key, format: "pem" });
    const signature = sign(null, Buffer.from(toSign), key);
    const sigEncoded = base64url(signature.buffer as ArrayBuffer);

    const jwt = `${toSign}.${sigEncoded}`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    const tokenData = await tokenResponse.json() as any;
    if (!tokenData.access_token) {
      throw new Error("Failed to get access token");
    }

    cachedToken = {
      token: tokenData.access_token,
      expiresAt: now + tokenData.expires_in,
    };

    return tokenData.access_token;
  } catch (err) {
    if (FCM_SERVICE_ACCOUNT) {
      throw err;
    }
    return "";
  }
}

async function sendFcm(message: FcmMessage): Promise<FcmSendResult> {
  if (!FCM_PROJECT_ID || !FCM_SERVICE_ACCOUNT) {
    return { success: false, error: "FCM not configured" };
  }

  try {
    const token = await getAccessToken();
    if (!token) return { success: false, error: "FCM not configured" };

    const response = await fetch(FCM_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    });

    const data = await response.json() as any;

    if (response.ok) {
      return { success: true, name: data.name };
    }

    return { success: false, error: data.error?.message || `HTTP ${response.status}` };
  } catch (err: any) {
    return { success: false, error: err.message || "FCM send failed" };
  }
}

export class FCMService {
  static async sendToDevice(
    deviceToken: string,
    payload: { title: string; body: string; data?: Record<string, string>; image?: string; clickAction?: string; silent?: boolean }
  ): Promise<FcmSendResult> {
    const message: FcmMessage = {
      token: deviceToken,
      notification: payload.silent ? undefined : {
        title: payload.title,
        body: payload.body,
        ...(payload.image ? { image: payload.image } : {}),
      },
      data: payload.data,
      android: {
        priority: "high",
        notification: {
          ...(payload.clickAction ? { clickAction: payload.clickAction } : {}),
          ...(payload.silent ? { priority: "low", sound: "default", localOnly: true } : {}),
        },
      },
      apns: {
        payload: {
          aps: {
            alert: payload.silent ? undefined : { title: payload.title, body: payload.body },
            badge: 1,
            sound: payload.silent ? undefined : "default",
            contentAvailable: payload.silent ? true : undefined,
          },
        },
      },
    };

    return sendFcm(message);
  }

  static async sendToTopic(
    topic: string,
    payload: { title: string; body: string; data?: Record<string, string>; image?: string }
  ): Promise<FcmSendResult> {
    const message: FcmMessage = {
      topic,
      notification: { title: payload.title, body: payload.body, ...(payload.image ? { image: payload.image } : {}) },
      data: payload.data,
    };

    return sendFcm(message);
  }

  static async sendToMultiple(
    deviceTokens: string[],
    payload: { title: string; body: string; data?: Record<string, string>; image?: string; silent?: boolean }
  ): Promise<{ success: number; failures: Array<{ token: string; error: string }> }> {
    let success = 0;
    const failures: Array<{ token: string; error: string }> = [];

    for (const token of deviceTokens) {
      const result = await FCMService.sendToDevice(token, payload);
      if (result.success) {
        success++;
      } else {
        failures.push({ token, error: result.error || "Unknown" });
      }
    }

    return { success, failures };
  }

  static async sendToOrganization(
    organizationId: string,
    payload: { title: string; body: string; data?: Record<string, string>; silent?: boolean }
  ): Promise<{ sent: number; failed: number }> {
    const pushSubs = await prisma.pushSubscriptions.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, userId: true, endpoint: true },
    });

    if (pushSubs.length === 0) return { sent: 0, failed: 0 };

    const userIds = [...new Set(pushSubs.map((s) => s.userId))];
    const fcmTokens = await redis.smembers(`fcm:tokens:org:${organizationId}`).catch(() => [] as string[]);

    let sent = 0;
    let failed = 0;

    for (const fcmToken of fcmTokens) {
      const result = await FCMService.sendToDevice(fcmToken, payload);
      if (result.success) sent++;
      else failed++;
    }

    return { sent, failed };
  }

  static async registerToken(userId: string, organizationId: string, token: string): Promise<void> {
    await redis.sadd(`fcm:tokens:user:${userId}`, token);
    await redis.sadd(`fcm:tokens:org:${organizationId}`, token);
  }

  static async unregisterToken(userId: string, organizationId: string, token: string): Promise<void> {
    await redis.srem(`fcm:tokens:user:${userId}`, token);
    await redis.srem(`fcm:tokens:org:${organizationId}`, token);
  }

  static async getUserTokens(userId: string): Promise<string[]> {
    return redis.smembers(`fcm:tokens:user:${userId}`).catch(() => []);
  }

  static async sendSilentNotification(
    deviceToken: string,
    data: Record<string, string>
  ): Promise<FcmSendResult> {
    const message: FcmMessage = {
      token: deviceToken,
      data,
      android: { priority: "high" },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            badge: 0,
            sound: undefined,
          },
        },
      },
    };

    return sendFcm(message);
  }
}
