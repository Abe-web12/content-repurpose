import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail, sendUsageWarning, sendPaymentReceipt, sendPaymentFailed } from "@/lib/email/sender";
import { WebPushManager } from "./web-push";
import { FCMService } from "./fcm";
import { Resend } from "resend";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@repurposeai.com";

async function sendEmailGeneric(to: string, subject: string, html: string): Promise<void> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY || "");
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
  } catch {
  }
}

export type NotificationChannel = "in_app" | "email" | "webhook" | "push";
export type NotificationCategory =
  | "billing" | "usage" | "workflow" | "team" | "system"
  | "generation" | "marketing" | "security" | "integration";

export interface CreateNotificationInput {
  userId: string;
  type: string;
  category: NotificationCategory;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
  channel?: NotificationChannel;
  organizationId?: string;
  silent?: boolean;
}

const CATEGORY_PREFERENCES: Record<NotificationCategory, { defaultEmail: boolean; defaultInApp: boolean; defaultPush: boolean }> = {
  billing: { defaultEmail: true, defaultInApp: true, defaultPush: true },
  usage: { defaultEmail: true, defaultInApp: true, defaultPush: true },
  workflow: { defaultEmail: false, defaultInApp: true, defaultPush: false },
  team: { defaultEmail: true, defaultInApp: true, defaultPush: true },
  system: { defaultEmail: false, defaultInApp: true, defaultPush: false },
  generation: { defaultEmail: false, defaultInApp: true, defaultPush: false },
  marketing: { defaultEmail: false, defaultInApp: false, defaultPush: false },
  security: { defaultEmail: true, defaultInApp: true, defaultPush: true },
  integration: { defaultEmail: false, defaultInApp: true, defaultPush: false },
};

export class NotificationService {
  static async create(input: CreateNotificationInput): Promise<void> {
    await prisma.notifications.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        read: false,
      },
    });

    const prefs = CATEGORY_PREFERENCES[input.category];

    if (input.channel === "push" || (!input.channel && prefs.defaultPush)) {
      WebPushManager.sendToUser(input.userId, {
        title: input.title,
        body: input.message,
        data: { link: input.link, type: input.type, category: input.category, ...(input.metadata as Record<string, unknown>) },
        silent: input.silent,
        tag: input.type,
      }).catch(() => {});
    }

    if (input.channel === "email" || (!input.channel && prefs.defaultEmail)) {
      const email = await prisma.users.findUnique({ where: { id: input.userId }, select: { email: true, notifyOnBilling: true } }).catch(() => null);
      if (email?.email) {
        const isBillingCategory = input.category === "billing";
        if (!isBillingCategory || email.notifyOnBilling) {
          sendEmailGeneric(email.email, input.title, input.message).catch(() => {});
        }
      }
    }
  }

  static async createWithPush(input: CreateNotificationInput): Promise<void> {
    return NotificationService.create({ ...input, channel: input.channel || "push" });
  }

  static async createWithEmail(input: CreateNotificationInput): Promise<void> {
    return NotificationService.create({ ...input, channel: input.channel || "email" });
  }

  static async bulkCreate(inputs: CreateNotificationInput[]): Promise<number> {
    const data = inputs.map((i) => ({
      userId: i.userId,
      type: i.type,
      title: i.title,
      message: i.message,
      link: i.link,
      read: false,
    }));
    const result = await prisma.notifications.createMany({ data });
    return result.count;
  }

  static async list(
    userId: string,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean; category?: string },
  ): Promise<{ notifications: any[]; total: number; unreadCount: number }> {
    const where: Record<string, unknown> = { userId };
    if (options?.unreadOnly) where.read = false;
    if (options?.category) where.type = options.category;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notifications.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      prisma.notifications.count({ where }),
      prisma.notifications.count({ where: { userId, read: false } }),
    ]);

    return { notifications, total, unreadCount };
  }

  static async markRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notifications.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  static async markAllRead(userId: string): Promise<void> {
    await prisma.notifications.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  static async archive(notificationId: string, userId: string): Promise<void> {
    await prisma.notifications.delete({ where: { id: notificationId, userId } });
  }

  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notifications.count({ where: { userId, read: false } });
  }

  static async notifyBilling(userId: string, title: string, message: string): Promise<void> {
    await this.create({ userId, type: "billing", category: "billing", title, message });
  }

  static async notifyUsage(userId: string, used: number, limit: number): Promise<void> {
    const percentage = Math.round((used / limit) * 100);
    const title = percentage >= 100 ? "Generation limit reached" : `Usage at ${percentage}%`;
    const message = percentage >= 100
      ? "You've used all your generations. Purchase more credits to continue."
      : `You've used ${percentage}% of your monthly generation limit.`;
    await this.create({ userId, type: "usage", category: "usage", title, message });
  }

  static async notifyWorkflow(userId: string, workflowName: string, status: string): Promise<void> {
    const title = `Workflow ${status.toLowerCase()}`;
    const message = `Workflow "${workflowName}" ${status.toLowerCase()}.`;
    await this.create({ userId, type: "workflow", category: "workflow", title, message });
  }

  static async notifyTeam(userId: string, action: string, actorName: string): Promise<void> {
    const title = "Team update";
    const message = `${actorName} ${action}.`;
    await this.create({ userId, type: "team", category: "team", title, message });
  }

  static async notifyPush(userId: string, title: string, message: string, data?: Record<string, unknown>): Promise<void> {
    await this.create({ userId, type: "push", category: "system", title, message, metadata: data, channel: "push" });
  }
}
