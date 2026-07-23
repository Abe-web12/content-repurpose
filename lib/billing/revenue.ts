import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export class RevenueAnalytics {
  static async computeDailyMetrics(date: Date = new Date()): Promise<void> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const [activeSubs, newSubs, churnedSubs, invoices, creditSales] = await Promise.all([
      prisma.subscriptions.count({
        where: { status: "ACTIVE", createdAt: { lte: dayEnd } },
      }),
      prisma.subscriptionEvents.count({
        where: { eventType: "subscription_created", createdAt: { gte: dayStart, lt: dayEnd } },
      }),
      prisma.subscriptionEvents.count({
        where: { eventType: "subscription_canceled", createdAt: { gte: dayStart, lt: dayEnd } },
      }),
      prisma.invoices.findMany({
        where: { createdAt: { gte: dayStart, lt: dayEnd }, status: "PAID" },
        select: { amount: true, currency: true },
      }),
      prisma.userAddons.aggregate({
        where: { createdAt: { gte: dayStart, lt: dayEnd } },
        _sum: { amountPaid: true },
      }),
    ]);

    const subscriptions = await prisma.subscriptions.findMany({
      where: { status: "ACTIVE" },
      select: { plan: true },
    });

    const planPrices: Record<string, number> = {
      free: 0, starter: 1900, pro: 4900, business: 14900, enterprise: 49900,
    };
    const mrr = subscriptions.reduce((sum, s) => sum + (planPrices[s.plan] ?? 0), 0);
    const invoiceRevenue = invoices.reduce((sum, i) => sum + i.amount, 0);
    const totalCustomers = await prisma.users.count();
    const arpu = totalCustomers > 0 ? Math.round(mrr / totalCustomers * 100) / 100 : 0;

    const existing = await prisma.revenueMetrics.findUnique({ where: { date: dayStart } });
    const data = {
      mrr: mrr / 100,
      arr: (mrr * 12) / 100,
      arpu,
      newMrr: 0,
      churnMrr: 0,
      expansionMrr: 0,
      totalCustomers,
      activeSubscriptions: activeSubs,
      churnedCount: churnedSubs,
      newCustomers: newSubs,
      refundAmount: 0,
      creditSales: (creditSales._sum.amountPaid ?? 0) / 100,
    };

    if (existing) {
      await prisma.revenueMetrics.update({ where: { date: dayStart }, data });
    } else {
      await prisma.revenueMetrics.create({ data: { date: dayStart, ...data } });
    }
  }

  static async getDashboard(): Promise<{
    mrr: number;
    arr: number;
    arpu: number;
    totalCustomers: number;
    activeSubscriptions: number;
    churnRate: number;
    lifetimeValue: number;
    creditRevenue: number;
    trends: Array<{ date: string; mrr: number; newCustomers: number; churnedCount: number }>;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [latestMetrics, trends, totalRevenue, customerHealth] = await Promise.all([
      prisma.revenueMetrics.findFirst({ orderBy: { date: "desc" } }),
      prisma.revenueMetrics.findMany({
        where: { date: { gte: thirtyDaysAgo } },
        orderBy: { date: "asc" },
        select: { date: true, mrr: true, newCustomers: true, churnedCount: true },
      }),
      prisma.invoices.aggregate({
        where: { status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.customerHealth.findMany({
        select: { lifetimeValue: true },
      }),
    ]);

    const totalLtv = customerHealth.reduce((s, h) => s + h.lifetimeValue, 0);
    const avgLtv = customerHealth.length > 0 ? totalLtv / customerHealth.length : 0;

    const prevMetrics = await prisma.revenueMetrics.findFirst({
      where: { date: { lt: thirtyDaysAgo } },
      orderBy: { date: "desc" },
    });

    const churnRate = latestMetrics && prevMetrics
      ? latestMetrics.activeSubscriptions > 0 && prevMetrics.activeSubscriptions > 0
        ? Math.round(
            ((prevMetrics.activeSubscriptions - latestMetrics.activeSubscriptions) /
              prevMetrics.activeSubscriptions) *
              100 *
              10,
          ) / 10
        : 0
      : 0;

    return {
      mrr: latestMetrics?.mrr ?? 0,
      arr: latestMetrics?.arr ?? 0,
      arpu: latestMetrics?.arpu ?? 0,
      totalCustomers: latestMetrics?.totalCustomers ?? 0,
      activeSubscriptions: latestMetrics?.activeSubscriptions ?? 0,
      churnRate: Math.max(0, churnRate),
      lifetimeValue: Math.round(avgLtv * 100) / 100,
      creditRevenue: latestMetrics?.creditSales ?? 0,
      trends: trends.map((t) => ({
        date: t.date.toISOString().slice(0, 10),
        mrr: t.mrr,
        newCustomers: t.newCustomers,
        churnedCount: t.churnedCount,
      })),
    };
  }

  static async computeLifetimeValue(userId: string): Promise<number> {
    const [invoiceTotal, addonTotal] = await Promise.all([
      prisma.invoices.aggregate({
        where: { userId, status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.userAddons.aggregate({
        where: { userId },
        _sum: { amountPaid: true },
      }),
    ]);

    const invoiceAmount = (invoiceTotal._sum.amount ?? 0) / 100;
    const addonAmount = (addonTotal._sum.amountPaid ?? 0) / 100;
    return Math.round((invoiceAmount + addonAmount) * 100) / 100;
  }

  static async recordRefund(invoiceId: string, amount: number): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const metric = await prisma.revenueMetrics.findUnique({ where: { date: today } });
    if (metric) {
      await prisma.revenueMetrics.update({
        where: { date: today },
        data: { refundAmount: { increment: Math.abs(amount) } },
      });
    }
  }
}
