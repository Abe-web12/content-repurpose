import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export const EVENT_CATALOG = [
  "generation.created",
  "generation.completed",
  "generation.failed",
  "billing.updated",
  "subscription.updated",
  "credits.changed",
  "team.updated",
  "organization.updated",
  "referral.rewarded",
  "notification.created",
] as const;

export type EventType = (typeof EVENT_CATALOG)[number];

interface EventPayload {
  type: EventType;
  organizationId?: string;
  userId?: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

export class EventManager {
  static async emit(event: EventPayload): Promise<void> {
    const timestamp = event.timestamp || new Date().toISOString();
    const fullEvent = { ...event, timestamp };

    try {
      await redis.publish("events", JSON.stringify(fullEvent));
    } catch {}

    const endpoints = await prisma.webhookEndpoints.findMany({
      where: {
        organizationId: event.organizationId || undefined,
        isActive: true,
        triggerEvents: { has: event.type },
      },
    });

    for (const endpoint of endpoints) {
      const { WebhookManager } = await import("./webhooks");
      await WebhookManager.deliver(endpoint, fullEvent).catch((err) => {
        console.error(`[Events] Delivery failed for ${endpoint.id}:`, err);
      });
    }
  }

  static async getDeliveriesForEvent(
    eventType: string,
    options: { limit?: number; offset?: number; status?: string } = {}
  ) {
    const where: any = { eventType };
    if (options.status) where.status = options.status;

    return prisma.webhookDeliveries.findMany({
      where: where.status ? { eventType, status: options.status } : { eventType },
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    });
  }

  static async getRecentEvents(organizationId: string, limit = 20) {
    const endpoints = await prisma.webhookEndpoints.findMany({
      where: { organizationId },
      select: { id: true, name: true, url: true },
    });
    const endpointIds = endpoints.map((e) => e.id);
    const deliveries = await prisma.webhookDeliveries.findMany({
      where: { endpointId: { in: endpointIds } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    const endpointMap = new Map(endpoints.map((e) => [e.id, { name: e.name, url: e.url }]));
    return deliveries.map((d) => ({
      ...d,
      endpoint: endpointMap.get(d.endpointId) || null,
    }));
  }

  static isValidEventType(type: string): type is EventType {
    return (EVENT_CATALOG as readonly string[]).includes(type);
  }
}
