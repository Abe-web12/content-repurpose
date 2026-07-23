import { prisma } from "@/lib/prisma";
import { deliverWebhook } from "@/lib/webhooks/trigger";

export async function dispatchWebhookEvent(
  userId: string,
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const webhooks = await prisma.userWebhooks.findMany({
      where: {
        userId,
        isActive: true,
        triggerEvents: { has: event },
      },
      select: { id: true, url: true, secret: true },
    });

    if (!webhooks || webhooks.length === 0) return;

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    for (const webhook of webhooks) {
      deliverWebhook(webhook.url, payload, {
        webhookId: webhook.id,
        event,
        secret: webhook.secret,
      }).catch((err: Error) => {
        console.error(`[Webhook] delivery failed: webhook=${webhook.id} event=${event}:`, err.message);
      });
    }
  } catch (err) {
    console.error(`[Webhook] dispatch error: user=${userId} event=${event}:`, (err as Error).message);
  }
}
