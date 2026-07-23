import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { FraudDetector } from "./fraud-detection";
import { CreditManager } from "@/lib/billing/credits";
import { randomBytes } from "crypto";

const CODE_CACHE_TTL = 86400;
const REFERRAL_CACHE_PREFIX = "referral:code:";

function generateCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export class ReferralEngine {
  static async generateCode(userId: string): Promise<string> {
    const existing = await prisma.referralCodes.findUnique({ where: { userId } });
    if (existing) return existing.code;

    for (let attempt = 0; attempt < 10; attempt++) {
      const code = generateCode();
      const collision = await prisma.referralCodes.findUnique({ where: { code } });
      if (!collision) {
        const rc = await prisma.referralCodes.create({ data: { userId, code } });
        return rc.code;
      }
    }
    throw new Error("Unable to generate unique referral code");
  }

  static async getCode(userId: string): Promise<string | null> {
    const cached = await redis.get(`${REFERRAL_CACHE_PREFIX}${userId}`);
    if (cached && typeof cached === "string") return cached;

    const rc = await prisma.referralCodes.findUnique({ where: { userId } });
    if (!rc) return null;

    await redis.set(`${REFERRAL_CACHE_PREFIX}${userId}`, rc.code, { ex: CODE_CACHE_TTL });
    return rc.code;
  }

  static async validateReferral(code: string, inviteeId: string): Promise<{ valid: boolean; error?: string; inviterId?: string }> {
    const referralCode = await prisma.referralCodes.findUnique({ where: { code } });
    if (!referralCode) return { valid: false, error: "Invalid referral code" };

    if (referralCode.userId === inviteeId) return { valid: false, error: "Cannot refer yourself" };

    const invitee = await prisma.users.findUnique({ where: { id: inviteeId }, select: { email: true } });
    const existing = await prisma.referralEvents.findFirst({
      where: {
        OR: [
          { inviteeId },
          ...(invitee?.email ? [{ inviteeEmail: invitee.email }] : []),
        ],
      },
    });
    if (existing) return { valid: false, error: "Already referred" };

    const fraud = await FraudDetector.check(inviteeId, referralCode.userId);
    if (fraud.flagged) return { valid: false, error: fraud.reason };

    return { valid: true, inviterId: referralCode.userId };
  }

  static async applyReferral(code: string, inviteeId: string): Promise<{ success: boolean; eventId: string }> {
    const validation = await this.validateReferral(code, inviteeId);
    if (!validation.valid) throw new Error(validation.error);

    const referralCode = await prisma.referralCodes.findUnique({ where: { code } });
    const event = await prisma.referralEvents.create({
      data: {
        inviterId: validation.inviterId!,
        inviteeId,
        referralCodeId: referralCode!.id,
        eventType: "signup",
        status: "PENDING",
      },
    });

    await prisma.referralLeaderboard.upsert({
      where: { userId: validation.inviterId! },
      create: { userId: validation.inviterId!, totalReferrals: 1, convertedCount: 0, totalCredits: 0, totalRevenue: 0 },
      update: { totalReferrals: { increment: 1 } },
    });

    return { success: true, eventId: event.id };
  }

  static async onSubscriptionCreated(inviteeId: string): Promise<void> {
    const event = await prisma.referralEvents.findFirst({
      where: { inviteeId, eventType: "signup", status: "PENDING" },
    });
    if (!event) return;

    await prisma.referralEvents.update({
      where: { id: event.id },
      data: { status: "CONVERTED", eventType: "subscription" },
    });

    const reward = await prisma.referralRewards.findFirst({
      where: { isActive: true, type: "CREDITS" },
      orderBy: { createdAt: "desc" },
    });

    if (reward) {
      await CreditManager.addCredits(event.inviterId, Math.floor(reward.value), "REFERRAL", { description: `Referral reward: ${reward.name}` });
      await prisma.referralPayouts.create({
        data: {
          userId: event.inviterId,
          referralEventId: event.id,
          creditAmount: Math.floor(reward.value),
          status: "paid",
          paidAt: new Date(),
        },
      });
    }

    await prisma.referralLeaderboard.update({
      where: { userId: event.inviterId },
      data: {
        convertedCount: { increment: 1 },
        totalCredits: { increment: reward ? Math.floor(reward.value) : 0 },
      },
    });
  }

  static async getStats(userId: string): Promise<{
    totalInvites: number;
    convertedCount: number;
    totalCredits: number;
    totalRevenue: number;
    pendingRewards: number;
    conversionRate: number;
  }> {
    const events = await prisma.referralEvents.findMany({ where: { inviterId: userId } });
    const totalInvites = events.length;
    const convertedCount = events.filter((e) => e.status === "CONVERTED" || e.status === "REWARDED").length;
    const leaderboard = await prisma.referralLeaderboard.findUnique({ where: { userId } });
    const pendingCount = await prisma.referralPayouts.count({ where: { userId, status: "pending" } });

    return {
      totalInvites,
      convertedCount,
      totalCredits: leaderboard?.totalCredits ?? 0,
      totalRevenue: leaderboard?.totalRevenue ?? 0,
      pendingRewards: pendingCount,
      conversionRate: totalInvites > 0 ? Math.round((convertedCount / totalInvites) * 100) : 0,
    };
  }

  static async getLeaderboard(limit = 20): Promise<Array<{ userId: string; totalReferrals: number; convertedCount: number; totalRevenue: number; rank: number }>> {
    const entries = await prisma.referralLeaderboard.findMany({
      orderBy: { totalRevenue: "desc" },
      take: limit,
    });

    const userIds = entries.map(e => e.userId);
    const userRows = userIds.length > 0 ? await prisma.users.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true, email: true },
    }) : [];
    const userMap = new Map(userRows.map(u => [u.id, u]));

    return entries.map((e, i) => ({
      ...e,
      rank: i + 1,
      name: userMap.get(e.userId)?.fullName || userMap.get(e.userId)?.email?.split("@")[0] || "Anonymous",
    })) as any;
  }

  static async getEvents(userId: string, limit = 50, offset = 0): Promise<Array<{ id: string; inviteeEmail: string | null; eventType: string; status: string; createdAt: Date }>> {
    return prisma.referralEvents.findMany({
      where: { inviterId: userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: { id: true, inviteeEmail: true, eventType: true, status: true, createdAt: true },
    });
  }

  static async getRewards(userId: string): Promise<Array<{ id: string; creditAmount: number; cashAmount: number; status: string; paidAt: Date | null; createdAt: Date }>> {
    return prisma.referralPayouts.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  static async processStripePayment(inviteeId: string, amount: number): Promise<void> {
    const event = await prisma.referralEvents.findFirst({
      where: { inviteeId, eventType: { in: ["signup", "subscription"] }, status: "CONVERTED" },
    });
    if (!event) return;

    const percentageReward = await prisma.referralRewards.findFirst({
      where: { isActive: true, type: "PERCENTAGE" },
    });

    if (percentageReward) {
      const cashAmount = (amount * percentageReward.value) / 100;
      await prisma.referralPayouts.create({
        data: {
          userId: event.inviterId,
          referralEventId: event.id,
          cashAmount,
          status: "pending",
        },
      });

      await prisma.referralLeaderboard.update({
        where: { userId: event.inviterId },
        data: { totalRevenue: { increment: cashAmount } },
      });
    }
  }

  static async processPayout(payoutId: string): Promise<void> {
    const payout = await prisma.referralPayouts.findUnique({ where: { id: payoutId } });
    if (!payout || payout.status !== "pending") return;

    await prisma.referralPayouts.update({
      where: { id: payoutId },
      data: { status: "paid", paidAt: new Date() },
    });
  }

  static async getAnalytics(): Promise<{
    totalReferrals: number;
    totalConversions: number;
    totalRevenue: number;
    totalCreditsAwarded: number;
    topReferrers: number;
    conversionRate: number;
  }> {
    const [totalReferrals, totalConversions, totalRevenue, totalCreditsAwarded, topReferrers] = await Promise.all([
      prisma.referralEvents.count(),
      prisma.referralEvents.count({ where: { status: { in: ["CONVERTED", "REWARDED"] } } }),
      prisma.referralLeaderboard.aggregate({ _sum: { totalRevenue: true } }),
      prisma.referralLeaderboard.aggregate({ _sum: { totalCredits: true } }),
      prisma.referralLeaderboard.count(),
    ]);

    return {
      totalReferrals,
      totalConversions,
      totalRevenue: totalRevenue._sum.totalRevenue ?? 0,
      totalCreditsAwarded: totalCreditsAwarded._sum.totalCredits ?? 0,
      topReferrers,
      conversionRate: totalReferrals > 0 ? Math.round((totalConversions / totalReferrals) * 100) : 0,
    };
  }
}
