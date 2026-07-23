import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/utils/api-errors";
import { randomBytes, createHmac, timingSafeEqual } from "crypto";

const SIGNATURE_PREFIX = "whsec_";

function generateSecret(): string {
  return `${SIGNATURE_PREFIX}${randomBytes(32).toString("hex")}`;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export class WebhookManager {
  static async createEndpoint(orgId: string, userId: string, data: {
    name: string;
    url: string;
    triggerEvents: string[];
    description?: string;
    retryCount?: number;
    timeout?: number;
    secret?: string;
  }) {
    const secret = data.secret || generateSecret();
    const endpoint = await prisma.webhookEndpoints.create({
      data: {
        organizationId: orgId,
        userId,
        name: data.name,
        url: data.url,
        secret,
        triggerEvents: data.triggerEvents,
        description: data.description,
        retryCount: data.retryCount ?? 3,
        timeout: data.timeout ?? 10,
        isActive: true,
      },
    });

    await prisma.webhookSecrets.create({
      data: {
        endpointId: endpoint.id,
        organizationId: orgId,
        secretHash: secret,
        secretPrefix: secret.substring(0, 8),
        isActive: true,
      },
    });

    return endpoint;
  }

  static async getEndpoints(orgId: string) {
    return prisma.webhookEndpoints.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getEndpoint(endpointId: string) {
    const endpoint = await prisma.webhookEndpoints.findUnique({ where: { id: endpointId } });
    if (!endpoint) throw new AppError("Webhook endpoint not found", 404);
    return endpoint;
  }

  static async updateEndpoint(endpointId: string, data: Partial<{
    name: string;
    url: string;
    triggerEvents: string[];
    description: string;
    retryCount: number;
    timeout: number;
    isActive: boolean;
  }>) {
    const endpoint = await prisma.webhookEndpoints.findUnique({ where: { id: endpointId } });
    if (!endpoint) throw new AppError("Webhook endpoint not found", 404);
    return prisma.webhookEndpoints.update({ where: { id: endpointId }, data });
  }

  static async deleteEndpoint(endpointId: string) {
    await prisma.webhookEndpoints.delete({ where: { id: endpointId } });
  }

  static async rotateSecret(endpointId: string) {
    const endpoint = await prisma.webhookEndpoints.findUnique({ where: { id: endpointId } });
    if (!endpoint) throw new AppError("Webhook endpoint not found", 404);

    const oldSecret = endpoint.secret;
    const newSecret = generateSecret();

    await prisma.webhookSecrets.updateMany({
      where: { endpointId, isActive: true },
      data: { isActive: false, rotatedAt: new Date() },
    });

    await prisma.webhookSecrets.create({
      data: {
        endpointId,
        organizationId: endpoint.organizationId,
        secretHash: newSecret,
        secretPrefix: newSecret.substring(0, 8),
        isActive: true,
        rotatedFromId: oldSecret,
      },
    });

    await prisma.webhookEndpoints.update({
      where: { id: endpointId },
      data: { secret: newSecret },
    });

    return { secret: newSecret };
  }

  static async deliver(
    endpoint: { id: string; url: string; secret: string | null; retryCount: number; timeout: number },
    event: { type: string; data: Record<string, unknown>; timestamp: string }
  ): Promise<void> {
    const payload = JSON.stringify(event);
    const signature = endpoint.secret ? signPayload(payload, endpoint.secret) : "";

    const delivery = await prisma.webhookDeliveries.create({
      data: {
        endpointId: endpoint.id,
        eventType: event.type,
        payload: event as any,
        status: "delivering",
        attemptNumber: 1,
        maxAttempts: endpoint.retryCount + 1,
      },
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), (endpoint.timeout || 10) * 1000);

    const startTime = Date.now();

    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "RepurposeAI-Webhook/1.0",
          ...(signature ? { "X-Webhook-Signature": `sha256=${signature}` } : {}),
          "X-Webhook-Event": event.type,
          "X-Webhook-Delivery": delivery.id,
          "X-Webhook-Timestamp": event.timestamp,
        },
        body: payload,
        signal: controller.signal,
      });

      const duration = Date.now() - startTime;
      const responseBody = await response.text();

      if (response.ok) {
        await prisma.webhookDeliveries.update({
          where: { id: delivery.id },
          data: {
            status: "delivered",
            responseStatus: response.status,
            responseBody: responseBody.substring(0, 10000),
            duration,
            completedAt: new Date(),
          },
        });
        await prisma.webhookEndpoints.update({
          where: { id: endpoint.id },
          data: { lastSuccessAt: new Date(), lastError: null },
        });
      } else {
        await this.handleDeliveryFailure(delivery.id, endpoint, {
          status: response.status,
          body: responseBody,
          duration,
          error: `HTTP ${response.status}`,
        });
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      await this.handleDeliveryFailure(delivery.id, endpoint, {
        status: null,
        body: null,
        duration,
        error: err.name === "AbortError" ? "Timeout" : err.message || "Delivery failed",
      });
    }
  }

  private static async handleDeliveryFailure(
    deliveryId: string,
    endpoint: { id: string; retryCount: number; url: string },
    result: { status: number | null; body: string | null; duration: number; error: string }
  ) {
    const delivery = await prisma.webhookDeliveries.findUnique({ where: { id: deliveryId } });
    if (!delivery) return;

    const nextAttempt = delivery.attemptNumber + 1;

    if (nextAttempt <= delivery.maxAttempts) {
      const delay = Math.min(Math.pow(2, delivery.attemptNumber) * 60, 3600) * 1000;
      const nextRetryAt = new Date(Date.now() + delay);

      await prisma.webhookDeliveries.update({
        where: { id: deliveryId },
        data: {
          status: "retrying",
          responseStatus: result.status,
          responseBody: result.body?.substring(0, 10000) || null,
          duration: result.duration,
          error: result.error,
          attemptNumber: nextAttempt,
          nextRetryAt,
        },
      });
    } else {
      await prisma.webhookDeliveries.update({
        where: { id: deliveryId },
        data: {
          status: "failed",
          responseStatus: result.status,
          responseBody: result.body?.substring(0, 10000) || null,
          duration: result.duration,
          error: result.error,
          completedAt: new Date(),
        },
      });
      await prisma.webhookEndpoints.update({
        where: { id: endpoint.id },
        data: { lastFailureAt: new Date(), lastError: result.error },
      });
    }
  }

  static async retryDelivery(deliveryId: string) {
    const delivery = await prisma.webhookDeliveries.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery) throw new AppError("Delivery not found", 404);

    const endpoint = await prisma.webhookEndpoints.findUnique({
      where: { id: delivery.endpointId },
    });
    if (!endpoint) throw new AppError("Endpoint not found", 404);
    if (!endpoint.isActive) throw new AppError("Endpoint is inactive", 400);

    const newDelivery = await prisma.webhookDeliveries.create({
      data: {
        endpointId: delivery.endpointId,
        eventType: delivery.eventType,
        payload: delivery.payload as Prisma.InputJsonValue,
        status: "pending",
        attemptNumber: 1,
        maxAttempts: delivery.maxAttempts,
      },
    });

    await this.deliver(endpoint, delivery.payload as any);
    return newDelivery;
  }

  static async getDeliveries(
    endpointId: string,
    options: { limit?: number; offset?: number; status?: string } = {}
  ) {
    const where: any = { endpointId };
    if (options.status) where.status = options.status;

    return prisma.webhookDeliveries.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    });
  }

  static async getDeliveryStats(endpointId: string) {
    const [total, delivered, failed, retrying] = await Promise.all([
      prisma.webhookDeliveries.count({ where: { endpointId } }),
      prisma.webhookDeliveries.count({ where: { endpointId, status: "delivered" } }),
      prisma.webhookDeliveries.count({ where: { endpointId, status: "failed" } }),
      prisma.webhookDeliveries.count({ where: { endpointId, status: "retrying" } }),
    ]);

    return { total, delivered, failed, retrying, successRate: total > 0 ? (delivered / total) * 100 : 0 };
  }

  static verifySignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expected = signPayload(payload, secret);
      const sigBuffer = Buffer.from(signature.replace("sha256=", ""));
      const expectedBuffer = Buffer.from(expected);
      if (sigBuffer.length !== expectedBuffer.length) return false;
      return timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  static async retryFailedDeliveries() {
    const failedDeliveries = await prisma.webhookDeliveries.findMany({
      where: { status: "failed", completedAt: null },
      take: 50,
    });

    for (const delivery of failedDeliveries) {
      const endpoint = await prisma.webhookEndpoints.findUnique({
        where: { id: delivery.endpointId },
      });
      if (endpoint?.isActive) {
        await this.deliver(endpoint, delivery.payload as any).catch(() => {});
      }
    }
  }
}
