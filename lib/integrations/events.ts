import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { EVENT_CATALOG } from "@/lib/dev-platform/events";

interface GetEventsOptions {
  limit?: number;
  offset?: number;
  eventType?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

export class IntegrationEventManager {
  static async emit(
    installedId: string,
    organizationId: string,
    eventType: string,
    payload: Record<string, unknown>
  ) {
    if (!EVENT_CATALOG.includes(eventType as typeof EVENT_CATALOG[number])) {
      return null;
    }

    const event = await prisma.integrationEvents.create({
      data: {
        installedId,
        organizationId,
        eventType,
        payload: payload as any,
        status: "pending",
      },
    });

    return event;
  }

  static async getEvents(installedId: string, options?: GetEventsOptions) {
    const where: Prisma.IntegrationEventsWhereInput = { installedId };

    if (options?.eventType) {
      where.eventType = options.eventType;
    }
    if (options?.status) {
      where.status = options.status;
    }
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    const [events, total] = await Promise.all([
      prisma.integrationEvents.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      prisma.integrationEvents.count({ where }),
    ]);

    return { events, total, limit: options?.limit ?? 50, offset: options?.offset ?? 0 };
  }

  static async processPendingEvents(): Promise<number> {
    const pendingEvents = await prisma.integrationEvents.findMany({
      where: { status: "pending" },
      take: 100,
      orderBy: { createdAt: "asc" },
    });

    let processedCount = 0;

    for (const event of pendingEvents) {
      try {
        const webhooks = await prisma.integrationWebhooks.findMany({
          where: {
            installedId: event.installedId,
            event: event.eventType as Prisma.EnumWebhookEventFilter["equals"],
            isActive: true,
          },
        });

        for (const webhook of webhooks) {
          const { IntegrationWebhookManager } = await import("./webhooks");
          await IntegrationWebhookManager.dispatch(
            event.installedId,
            webhook.event,
            event.payload as Record<string, unknown>
          );
        }

        await prisma.integrationEvents.update({
          where: { id: event.id },
          data: {
            status: "processed",
            processedAt: new Date(),
          },
        });

        processedCount++;
      } catch (err) {
        await prisma.integrationEvents.update({
          where: { id: event.id },
          data: {
            status: "failed",
            error: err instanceof Error ? err.message : "Processing failed",
            processedAt: new Date(),
          },
        });
      }
    }

    return processedCount;
  }
}