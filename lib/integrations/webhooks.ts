import { randomBytes, createHmac } from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { WebhookDispatchError, sanitizeError } from "./errors";
import { WebhookDispatchResult } from "./types";
import { IntegrationLogger } from "./logs";

function generateWebhookSecret(): string {
  return `whsec_${randomBytes(32).toString("hex")}`;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function calculateBackoff(attempt: number): number {
  return Math.min(Math.pow(2, attempt) * 60, 3600) * 1000;
}

type WebhookEvent = NonNullable<Prisma.EnumWebhookEventFilter["equals"]>;

export class IntegrationWebhookManager {
  static async register(
    installedId: string,
    organizationId: string,
    event: string,
    targetUrl: string
  ) {
    const secret = generateWebhookSecret();

    const webhook = await prisma.integrationWebhooks.create({
      data: {
        installedId,
        organizationId,
        event: event as WebhookEvent,
        targetUrl,
        secret,
        isActive: true,
      },
    });

    await IntegrationLogger.log(installedId, organizationId, "info", `Webhook registered for event ${event}`, {
      webhookId: webhook.id,
      targetUrl,
      event,
    });

    return webhook;
  }

  static async unregister(id: string): Promise<void> {
    const webhook = await prisma.integrationWebhooks.findUnique({
      where: { id },
    });
    if (!webhook) return;

    await prisma.integrationWebhooks.update({
      where: { id },
      data: { isActive: false },
    });

    await IntegrationLogger.log(
      webhook.installedId,
      webhook.organizationId,
      "info",
      `Webhook unregistered for event ${webhook.event}`,
      { webhookId: id }
    );
  }

  static async dispatch(
    installedId: string,
    event: string,
    payload: Record<string, unknown>
  ): Promise<WebhookDispatchResult[]> {
    const webhooks = await prisma.integrationWebhooks.findMany({
      where: {
        installedId,
        event: event as WebhookEvent,
        isActive: true,
      },
    });

    const results: WebhookDispatchResult[] = [];

    for (const webhook of webhooks) {
      const result = await this.deliverToWebhook(webhook, payload);
      results.push(result);
    }

    return results;
  }

  private static async deliverToWebhook(
    webhook: {
      id: string;
      targetUrl: string;
      secret: string | null;
      installedId: string;
      organizationId: string;
      event: string;
      failureCount?: number;
    },
    payload: Record<string, unknown>
  ): Promise<WebhookDispatchResult> {
    const body = JSON.stringify(payload);
    const signature = webhook.secret ? signPayload(body, webhook.secret) : "";

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(webhook.targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "RepurposeAI-Integration/1.0",
          ...(signature ? { "X-Integration-Signature": `sha256=${signature}` } : {}),
          "X-Integration-Event": webhook.event,
          "X-Integration-Webhook": webhook.id,
        },
        body,
        signal: controller.signal,
      });

      const duration = Date.now() - startTime;

      if (response.ok) {
        await prisma.integrationWebhooks.update({
          where: { id: webhook.id },
          data: {
            lastTriggeredAt: new Date(),
            failureCount: 0,
          },
        });

        await IntegrationLogger.log(
          webhook.installedId,
          webhook.organizationId,
          "info",
          `Webhook delivered successfully for event ${webhook.event}`,
          { webhookId: webhook.id, statusCode: response.status, duration, targetUrl: webhook.targetUrl },
          "webhook"
        );

        return { success: true, statusCode: response.status, duration };
      }

      await this.handleFailedDelivery(webhook, payload, {
        statusCode: response.status,
        duration,
        error: `HTTP ${response.status}`,
      });

      return { success: false, statusCode: response.status, duration, error: `HTTP ${response.status}` };
    } catch (err) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      await this.handleFailedDelivery(webhook, payload, {
        statusCode: undefined,
        duration,
        error: errorMessage,
      });

      return { success: false, duration, error: errorMessage };
    }
  }

  private static async handleFailedDelivery(
    webhook: {
      id: string;
      installedId: string;
      organizationId: string;
      event: string;
      targetUrl?: string;
      failureCount?: number;
    },
    payload: Record<string, unknown>,
    result: { statusCode?: number; duration: number; error: string }
  ): Promise<void> {
    const newFailureCount = (webhook.failureCount ?? 0) + 1;

    await prisma.integrationWebhooks.update({
      where: { id: webhook.id },
      data: {
        failureCount: newFailureCount,
        lastTriggeredAt: new Date(),
      },
    });

    await IntegrationLogger.log(
      webhook.installedId,
      webhook.organizationId,
      "error",
      `Webhook delivery failed for event ${webhook.event}: ${result.error}`,
      {
        webhookId: webhook.id,
        statusCode: result.statusCode,
        duration: result.duration,
        error: result.error,
        attempt: newFailureCount,
        targetUrl: webhook.targetUrl ?? "",
      },
      "webhook"
    );
  }

  static async retryFailed(installedId: string): Promise<number> {
    const failedWebhooks = await prisma.integrationWebhooks.findMany({
      where: {
        installedId,
        isActive: true,
        failureCount: { gt: 0 },
      },
    });

    let retriedCount = 0;

    for (const webhook of failedWebhooks) {
      const backoff = calculateBackoff(webhook.failureCount);
      const lastTriggeredAt = webhook.lastTriggeredAt ?? new Date(0);
      const timeSinceLastAttempt = Date.now() - lastTriggeredAt.getTime();

      if (timeSinceLastAttempt < backoff) continue;

      const recentEvents = await prisma.integrationEvents.findMany({
        where: {
          installedId,
          status: "processed",
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      });

      if (recentEvents.length > 0) {
        await this.deliverToWebhook(webhook, recentEvents[0].payload as Record<string, unknown>);
        retriedCount++;
      }
    }

    return retriedCount;
  }
}
