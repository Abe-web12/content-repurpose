import { prisma } from "@/lib/prisma";

export interface ReferralFunnel {
  invites: number;
  signups: number;
  conversions: number;
  rewarded: number;
}

export interface MonthlyGrowth {
  month: string;
  invites: number;
  conversions: number;
  revenue: number;
}

export class ReferralAnalytics {
  static async getFunnel(userId?: string): Promise<ReferralFunnel> {
    const where = userId ? { inviterId: userId } : {};

    const [invites, signups, conversions, rewarded] = await Promise.all([
      prisma.referralEvents.count({ where: { ...where, eventType: "invite" } }),
      prisma.referralEvents.count({ where: { ...where, eventType: "signup" } }),
      prisma.referralEvents.count({ where: { ...where, status: "CONVERTED" } }),
      prisma.referralEvents.count({ where: { ...where, status: "REWARDED" } }),
    ]);

    return { invites, signups, conversions, rewarded };
  }

  static async getMonthlyGrowth(months = 12): Promise<MonthlyGrowth[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const events = await prisma.referralEvents.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, status: true, eventType: true },
    });

    const payouts = await prisma.referralPayouts.findMany({
      where: { createdAt: { gte: since }, status: "paid" },
      select: { createdAt: true, cashAmount: true },
    });

    const monthlyMap = new Map<string, MonthlyGrowth>();

    for (let i = 0; i < months; i++) {
      const d = new Date(since.getFullYear(), since.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, { month: key, invites: 0, conversions: 0, revenue: 0 });
    }

    for (const e of events) {
      const key = `${e.createdAt.getFullYear()}-${String(e.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthlyMap.get(key);
      if (entry) {
        if (e.eventType === "invite") entry.invites++;
        if (e.status === "CONVERTED") entry.conversions++;
      }
    }

    for (const p of payouts) {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthlyMap.get(key);
      if (entry) entry.revenue += p.cashAmount;
    }

    return Array.from(monthlyMap.values());
  }

  static async getTopReferrers(limit = 10): Promise<Array<{ userId: string; name: string; totalReferrals: number; convertedCount: number; totalRevenue: number }>> {
    const entries = await prisma.referralLeaderboard.findMany({
      orderBy: { totalRevenue: "desc" },
      take: limit,
    });

    return Promise.all(
      entries.map(async (e) => {
        const user = await prisma.users.findUnique({ where: { id: e.userId }, select: { fullName: true, email: true } });
        return {
          userId: e.userId,
          name: user?.fullName || user?.email?.split("@")[0] || "Anonymous",
          totalReferrals: e.totalReferrals,
          convertedCount: e.convertedCount,
          totalRevenue: e.totalRevenue,
        };
      })
    );
  }

  static async getReferralRate(): Promise<{ rate: number; totalSignups: number; referredSignups: number }> {
    const [totalSignups, referredSignups] = await Promise.all([
      prisma.users.count(),
      prisma.referralEvents.count({ where: { eventType: { in: ["signup", "subscription"] }, status: { not: "PENDING" } } }),
    ]);

    return {
      rate: totalSignups > 0 ? Math.round((referredSignups / totalSignups) * 100) : 0,
      totalSignups,
      referredSignups,
    };
  }
}
