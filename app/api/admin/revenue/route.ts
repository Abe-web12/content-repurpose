export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { RevenueAnalytics } from "@/lib/billing/revenue";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());
    if (adminEmails.length > 0 && !adminEmails.includes(user.email?.toLowerCase() ?? "")) {
      throw new AppError("Forbidden", 403);
    }

    const limitResult = await rateLimit(`admin:revenue:${user.id}`, {
      windowMs: 60000, maxRequests: 30,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const [dashboard, metrics] = await Promise.all([
      RevenueAnalytics.getDashboard(),
      prisma.revenueMetrics.findMany({
        orderBy: { date: "desc" },
        take: 90,
      }),
    ]);

    const totalLifetimeRevenue = await prisma.invoices.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    });

    const activeSubscriptions = await prisma.subscriptions.count({
      where: { status: "ACTIVE" },
    });

    const totalUsers = await prisma.users.count();

    const subscriptionsByPlan = await prisma.subscriptions.groupBy({
      by: ["plan"],
      where: { status: "ACTIVE" },
      _count: true,
    });

    return NextResponse.json({
      data: {
        ...dashboard,
        totalLifetimeRevenue: (totalLifetimeRevenue._sum.amount ?? 0) / 100,
        activeSubscriptions,
        totalUsers,
        subscriptionsByPlan: subscriptionsByPlan.map((s) => ({
          plan: s.plan,
          count: s._count,
        })),
        dailyMetrics: metrics.map((m) => ({
          date: m.date.toISOString().slice(0, 10),
          mrr: m.mrr,
          arr: m.arr,
          arpu: m.arpu,
          newCustomers: m.newCustomers,
          churnedCount: m.churnedCount,
          refundAmount: m.refundAmount,
          creditSales: m.creditSales,
        })),
      },
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
