import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import {
  sendCreditWarning,
  sendExpiringSubscription,
  sendUpgradeSuggestion,
  sendChurnPrevention,
} from "@/lib/email/sender";

const SEVEN_DAYS = 7 * 86400000;
const THIRTY_DAYS = 30 * 86400000;

function cooldownKey(userId: string, type: string): string {
  return `automation:cooldown:${userId}:${type}`;
}

async function checkCooldown(userId: string, type: string): Promise<boolean> {
  const val = await redis.get(cooldownKey(userId, type));
  return val !== null;
}

async function setCooldown(userId: string, type: string, ttlMs: number = SEVEN_DAYS): Promise<void> {
  await redis.set(cooldownKey(userId, type), "1", { ex: Math.ceil(ttlMs / 1000) });
}

export class SubscriptionAutomation {
  static async checkUsageWarnings(): Promise<Array<{ userId: string; plan: string; usage: number; limit: number; emailSent: boolean }>> {
    const users = await prisma.users.findMany({
      where: {
        plan: { not: "free" },
        generationsLimit: { gt: 0 },
        notifyOnBilling: true,
      },
      select: { id: true, plan: true, generationsUsed: true, generationsLimit: true, email: true, fullName: true, lastUsageAlertSent: true },
    });

    const warned: Array<{ userId: string; plan: string; usage: number; limit: number; emailSent: boolean }> = [];

    for (const user of users) {
      const usagePercent = (user.generationsUsed / user.generationsLimit) * 100;
      if (usagePercent >= 80 && usagePercent < 100) {
        const cooldown = await checkCooldown(user.id, "usage_warning");
        if (!cooldown) {
          const name = user.fullName || user.email?.split("@")[0] || "there";
          const emailSent = await sendCreditWarning(user.email, name, user.generationsLimit - user.generationsUsed, null);
          warned.push({ userId: user.id, plan: user.plan, usage: user.generationsUsed, limit: user.generationsLimit, emailSent });
          if (emailSent) {
            await setCooldown(user.id, "usage_warning");
          }
        }
      }
    }

    return warned;
  }

  static async checkExpiringSubscriptions(): Promise<Array<{ userId: string; plan: string; daysLeft: number; emailSent: boolean }>> {
    const sevenDaysFromNow = new Date(Date.now() + SEVEN_DAYS);
    const tomorrow = new Date(Date.now() + 86400000);

    const subs = await prisma.subscriptions.findMany({
      where: {
        status: "ACTIVE",
        currentPeriodEnd: { gte: tomorrow, lte: sevenDaysFromNow },
      },
      select: { userId: true, plan: true, currentPeriodEnd: true },
    });

    const result: Array<{ userId: string; plan: string; daysLeft: number; emailSent: boolean }> = [];
    const userIds = subs.map(s => s.userId);
    const userMap = userIds.length > 0 ? new Map(
      (await prisma.users.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, fullName: true, notifyOnBilling: true },
      })).map(u => [u.id, u])
    ) : new Map();

    for (const s of subs) {
      const daysLeft = s.currentPeriodEnd
        ? Math.ceil((s.currentPeriodEnd.getTime() - Date.now()) / 86400000)
        : 0;

      if (daysLeft <= 0) continue;

      const cooldown = await checkCooldown(s.userId, "expiring_subscription");
      if (!cooldown) {
        const user = userMap.get(s.userId);
        if (user?.notifyOnBilling && user.email) {
          const name = user.fullName || user.email.split("@")[0];
          const emailSent = await sendExpiringSubscription(user.email, name, s.plan, daysLeft);
          if (emailSent) await setCooldown(s.userId, "expiring_subscription");
          result.push({ userId: s.userId, plan: s.plan, daysLeft, emailSent });
        }
      }
    }

    return result;
  }

  static async checkPastDueSubscriptions(): Promise<Array<{ userId: string; plan: string; daysOverdue: number }>> {
    const subs = await prisma.subscriptions.findMany({
      where: {
        status: "PAST_DUE",
        currentPeriodEnd: { lt: new Date() },
      },
      select: { userId: true, plan: true, currentPeriodEnd: true },
    });

    return subs.map((s) => ({
      userId: s.userId,
      plan: s.plan,
      daysOverdue: s.currentPeriodEnd
        ? Math.floor((Date.now() - s.currentPeriodEnd.getTime()) / 86400000)
        : 0,
    }));
  }

  static async suggestUpgrade(userId: string): Promise<{ suggested: string; reason: string; emailSent: boolean } | null> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { plan: true, generationsUsed: true, generationsLimit: true, email: true, fullName: true, notifyOnBilling: true },
    });
    if (!user || user.plan === "enterprise" || user.generationsLimit === -1) return null;

    const usagePercent = user.generationsLimit > 0
      ? (user.generationsUsed / user.generationsLimit) * 100
      : 0;

    if (usagePercent >= 80) {
      const upgradeMap: Record<string, string> = { free: "starter", starter: "pro", pro: "business" };
      const suggested = upgradeMap[user.plan];
      if (suggested) {
        const reason = `You've used ${Math.round(usagePercent)}% of your plan's capacity`;
        const cooldown = await checkCooldown(userId, "upgrade_suggestion");
        let emailSent = false;
        if (!cooldown && user.notifyOnBilling && user.email) {
          const name = user.fullName || user.email.split("@")[0];
          emailSent = await sendUpgradeSuggestion(user.email, name, user.plan, suggested, reason);
          if (emailSent) await setCooldown(userId, "upgrade_suggestion", THIRTY_DAYS);
        }
        return { suggested, reason, emailSent };
      }
    }

    return null;
  }

  static async checkDowngradeRisk(): Promise<Array<{ userId: string; plan: string; daysSinceLastGeneration: number; emailSent: boolean }>> {
    const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS);

    const paidUsers = await prisma.users.findMany({
      where: { plan: { in: ["starter", "pro"] }, notifyOnBilling: true },
      select: { id: true, plan: true, email: true, fullName: true },
    });

    const atRisk: Array<{ userId: string; plan: string; daysSinceLastGeneration: number; emailSent: boolean }> = [];

    const paidUserIds = paidUsers.map(u => u.id);
    const lastGenRows = paidUserIds.length > 0 ? await prisma.generations.findMany({
      where: { userId: { in: paidUserIds } },
      orderBy: { createdAt: "desc" },
      select: { userId: true, createdAt: true },
    }) : [];
    const lastGenMap = new Map<string, Date>();
    for (const gen of lastGenRows) {
      if (!lastGenMap.has(gen.userId)) {
        lastGenMap.set(gen.userId, gen.createdAt);
      }
    }

    for (const user of paidUsers) {
      const lastGenDate = lastGenMap.get(user.id);
      if (lastGenDate && lastGenDate < thirtyDaysAgo) {
        const daysSince = Math.floor((Date.now() - lastGenDate.getTime()) / 86400000);
        if (daysSince >= 30) {
          const cooldown = await checkCooldown(user.id, "churn_prevention");
          let emailSent = false;
          if (!cooldown && user.email) {
            const name = user.fullName || user.email.split("@")[0];
            emailSent = await sendChurnPrevention(user.email, name, user.plan, daysSince);
            if (emailSent) await setCooldown(user.id, "churn_prevention", THIRTY_DAYS);
          }
          atRisk.push({ userId: user.id, plan: user.plan, daysSinceLastGeneration: daysSince, emailSent });
        }
      }
    }

    return atRisk;
  }

  static async processRenewals(): Promise<number> {
    const today = new Date();
    const subs = await prisma.subscriptions.findMany({
      where: {
        status: "ACTIVE",
        currentPeriodEnd: { lte: today },
        cancelAtPeriodEnd: false,
      },
      select: { id: true, userId: true, plan: true },
    });

    for (const sub of subs) {
      await prisma.subscriptionEvents.create({
        data: {
          subscriptionId: sub.id,
          userId: sub.userId,
          eventType: "subscription_renewed",
          newPlan: sub.plan,
          metadata: {} as any,
        },
      });
    }

    return subs.length;
  }

  static async runAllChecks(): Promise<{
    usageWarnings: number;
    expiringSubscriptions: number;
    pastDueSubscriptions: number;
    downgradeRisks: number;
    upgradesSent: number;
  }> {
    const [usageWarnings, expiringSubscriptions, pastDueSubscriptions, downgradeRisks] = await Promise.all([
      this.checkUsageWarnings(),
      this.checkExpiringSubscriptions(),
      this.checkPastDueSubscriptions(),
      this.checkDowngradeRisk(),
    ]);

    return {
      usageWarnings: usageWarnings.length,
      expiringSubscriptions: expiringSubscriptions.length,
      pastDueSubscriptions: pastDueSubscriptions.length,
      downgradeRisks: downgradeRisks.length,
      upgradesSent: 0,
    };
  }

  static async getAlerts(): Promise<{
    usageWarnings: number;
    expiringSubscriptions: number;
    pastDueSubscriptions: number;
    downgradeRisks: number;
  }> {
    const [usageWarnings, expiringSubscriptions, pastDueSubscriptions, downgradeRisks] = await Promise.all([
      this.checkUsageWarnings(),
      this.checkExpiringSubscriptions(),
      this.checkPastDueSubscriptions(),
      this.checkDowngradeRisk(),
    ]);

    return {
      usageWarnings: usageWarnings.length,
      expiringSubscriptions: expiringSubscriptions.length,
      pastDueSubscriptions: pastDueSubscriptions.length,
      downgradeRisks: downgradeRisks.length,
    };
  }
}
