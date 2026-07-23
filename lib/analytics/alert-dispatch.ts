import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { NotificationService } from "@/lib/notifications";
import { AppError } from "@/lib/utils/api-errors";
import { Resend } from "resend";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@repurposeai.com";

function getResend(): Resend {
  return new Resend(process.env.RESEND_API_KEY || "");
}

type ChannelType = "email" | "webhook" | "slack" | "discord";

interface DispatchResult {
  channel: ChannelType;
  success: boolean;
  error?: string;
}

interface SlackPayload {
  text: string;
  attachments?: Array<{
    title?: string;
    text?: string;
    color?: string;
    fields?: Array<{ title: string; value: string; short?: boolean }>;
    ts?: number;
  }>;
}

interface DiscordPayload {
  content?: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    timestamp?: string;
  }>;
}

const QUEUE_KEY = "alert:dispatch:queue";
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 5_000;

export class AlertDispatcher {
  static async dispatch(
    alert: { id: string; organizationId: string; name: string; metric: string; channels: any; userId?: string },
    event: { id: string; value: number; threshold: number; condition: string; message: string; createdAt: Date }
  ): Promise<DispatchResult[]> {
    const channels: ChannelType[] = Array.isArray(alert.channels) && alert.channels.length > 0
      ? alert.channels.filter((c: string): c is ChannelType => ["email", "webhook", "slack", "discord"].includes(c))
      : ["email"];

    const results: DispatchResult[] = [];

    for (const channel of channels) {
      try {
        await AlertDispatcher.dispatchToChannel(channel, alert, event);
        results.push({ channel, success: true });
      } catch (err: any) {
        const errorMsg = err.message || "Dispatch failed";
        results.push({ channel, success: false, error: errorMsg });

        await AlertDispatcher.enqueueRetry(alert, event, channel, 1);
      }
    }

    return results;
  }

  private static async dispatchToChannel(
    channel: ChannelType,
    alert: { id: string; organizationId: string; name: string; metric: string; userId?: string },
    event: { id: string; value: number; threshold: number; condition: string; message: string; createdAt: Date }
  ): Promise<void> {
    switch (channel) {
      case "email":
        await AlertDispatcher.dispatchEmail(alert, event);
        break;
      case "webhook":
        await AlertDispatcher.dispatchWebhook(alert, event);
        break;
      case "slack":
        await AlertDispatcher.dispatchSlack(alert, event);
        break;
      case "discord":
        await AlertDispatcher.dispatchDiscord(alert, event);
        break;
    }
  }

  private static async dispatchEmail(
    alert: { organizationId: string; name: string; metric: string; userId?: string },
    event: { message: string; value: number; threshold: number; condition: string }
  ): Promise<void> {
    const orgMembers = await prisma.organizationMembers.findMany({
      where: { organizationId: alert.organizationId },
      include: { user: { select: { email: true, fullName: true } } },
    });

    const errors: string[] = [];
    for (const member of orgMembers) {
      if (!member.user.email) continue;
      try {
        const resend = getResend();
        await resend.emails.send({
          from: FROM_EMAIL,
          to: member.user.email,
          subject: `[Alert] ${alert.name} - ${alert.metric}`,
          html: AlertDispatcher.buildEmailHtml(alert, event, member.user.fullName || member.user.email),
        });
      } catch {
        errors.push(member.user.email);
      }
    }

    if (errors.length > 0) {
      throw new AppError(`Failed to send to: ${errors.join(", ")}`, 500);
    }
  }

  private static async dispatchWebhook(
    alert: { organizationId: string; name: string },
    event: { message: string; value: number; threshold: number; condition: string; id: string }
  ): Promise<void> {
    const endpoints = await prisma.webhookEndpoints.findMany({
      where: {
        organizationId: alert.organizationId,
        isActive: true,
        triggerEvents: { hasSome: ["analytics.alert", "alert.triggered"] },
      },
    });

    const payload = {
      type: "analytics.alert",
      timestamp: new Date().toISOString(),
      data: {
        alertName: alert.name,
        metric: event.message.split(" ")[0],
        value: event.value,
        threshold: event.threshold,
        condition: event.condition,
        message: event.message,
        eventId: event.id,
      },
    };

    const { WebhookManager } = await import("@/lib/dev-platform/webhooks");
    for (const endpoint of endpoints) {
      await WebhookManager.deliver(endpoint, payload).catch(() => {});
    }
  }

  private static async dispatchSlack(
    alert: { organizationId: string; name: string; metric: string },
    event: { message: string; value: number; threshold: number; condition: string }
  ): Promise<void> {
    const slackIntegration = await prisma.installedIntegrations.findFirst({
      where: {
        organizationId: alert.organizationId,
        integrationKey: "slack",
        isPaused: false,
      },
    });

    const orgSettings = await prisma.securityPolicies.findUnique({
      where: { organizationId: alert.organizationId },
    });
    const webhookUrl = (orgSettings as any)?.slackWebhookUrl;
    if (!webhookUrl) throw new AppError("No Slack webhook configured", 404);

    const payload: SlackPayload = {
      text: `*Alert: ${alert.name}*`,
      attachments: [
        {
          color: event.condition === "gt" || event.condition === "gte" ? "danger" : "warning",
          title: alert.metric,
          text: event.message,
          fields: [
            { title: "Value", value: String(event.value), short: true },
            { title: "Threshold", value: String(event.threshold), short: true },
            { title: "Condition", value: event.condition, short: true },
          ],
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new AppError(`Slack webhook returned ${response.status}`, 500);
    }
  }

  private static async dispatchDiscord(
    alert: { organizationId: string; name: string; metric: string },
    event: { message: string; value: number; threshold: number; condition: string }
  ): Promise<void> {
    const orgSettings = await prisma.securityPolicies.findUnique({
      where: { organizationId: alert.organizationId },
    });
    const webhookUrl = (orgSettings as any)?.discordWebhookUrl;
    if (!webhookUrl) throw new AppError("No Discord webhook configured", 404);

    const payload: DiscordPayload = {
      embeds: [
        {
          title: `Alert: ${alert.name}`,
          description: event.message,
          color: event.condition === "gt" || event.condition === "gte" ? 0xef4444 : 0xf59e0b,
          fields: [
            { name: "Metric", value: alert.metric, inline: true },
            { name: "Value", value: String(event.value), inline: true },
            { name: "Threshold", value: String(event.threshold), inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new AppError(`Discord webhook returned ${response.status}`, 500);
    }
  }

  static async dispatchAlert(
    alert: { id: string; organizationId: string; name: string; metric: string; channels: any; userId?: string },
    event: { id: string; value: number; threshold: number; condition: string; message: string; createdAt: Date }
  ): Promise<void> {
    const results = await AlertDispatcher.dispatch(alert, event);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (successCount > 0 && alert.userId) {
      await NotificationService.create({
        userId: alert.userId,
        type: "alert",
        category: "system",
        title: `Alert triggered: ${alert.name}`,
        message: `"${alert.name}" triggered. ${successCount}/${results.length} channels delivered.`,
        metadata: { eventId: event.id, results },
      });
    }
  }

  private static async enqueueRetry(
    alert: any,
    event: any,
    channel: ChannelType,
    attempt: number
  ): Promise<void> {
    if (attempt > MAX_RETRIES) return;

    const delay = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
    const retryAt = Date.now() + delay;

    const queueItem = JSON.stringify({ alert, event, channel, attempt, retryAt });
    try {
      await redis.zadd(QUEUE_KEY, { score: retryAt, member: queueItem });
    } catch {
      await prisma.analyticsAlertEvents.update({
        where: { id: event.id },
        data: { status: `retry_pending_${channel}` },
      });
    }
  }

  static async processRetryQueue(batchSize = 20): Promise<number> {
    try {
      const now = Date.now();
      const items = await (redis as any).zrangebyscore(QUEUE_KEY, 0, now, { limit: batchSize });

      let processed = 0;
      for (const item of items) {
        try {
          const parsed = JSON.parse(item);
          await AlertDispatcher.dispatchToChannel(parsed.channel, parsed.alert, parsed.event);
          await redis.zrem(QUEUE_KEY, item);
          processed++;
        } catch {
          const parsed = JSON.parse(item);
          if (parsed.attempt >= MAX_RETRIES) {
            await redis.zrem(QUEUE_KEY, item);
          } else {
            await redis.zrem(QUEUE_KEY, item);
            await AlertDispatcher.enqueueRetry(parsed.alert, parsed.event, parsed.channel, parsed.attempt + 1);
          }
        }
      }

      return processed;
    } catch {
      return 0;
    }
  }

  static async getDispatchStatus(alertId: string, limit = 50) {
    const events = await prisma.analyticsAlertEvents.findMany({
      where: { alertId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return events.map((e) => ({
      id: e.id,
      status: e.status,
      message: e.message,
      value: e.value,
      threshold: e.threshold,
      condition: e.condition,
      triggeredAt: e.createdAt,
      acknowledgedAt: e.acknowledgedAt,
      resolvedAt: e.resolvedAt,
    }));
  }

  private static buildEmailHtml(
    alert: { name: string; metric: string },
    event: { message: string; value: number; threshold: number; condition: string },
    recipientName: string
  ): string {
    const color = event.condition === "gt" || event.condition === "gte" ? "#ef4444" : "#f59e0b";
    return `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"></head>
      <body style="font-family:-apple-system,sans-serif;padding:24px">
        <div style="max-width:560px;margin:0 auto">
          <h2 style="color:${color}">Alert: ${alert.name}</h2>
          <p>Hi ${recipientName},</p>
          <p>An analytics alert has been triggered:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Metric</td><td style="padding:8px;border:1px solid #ddd">${alert.metric}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Value</td><td style="padding:8px;border:1px solid #ddd">${event.value}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Threshold</td><td style="padding:8px;border:1px solid #ddd">${event.threshold}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Condition</td><td style="padding:8px;border:1px solid #ddd">${event.condition}</td></tr>
          </table>
          <p>${event.message}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
          <p style="color:#666;font-size:12px">Sent by RepurposeAI Analytics Alerts</p>
        </div>
      </body></html>`;
  }
}
