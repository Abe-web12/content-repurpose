import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "24h";

    const since = new Date();
    if (period === "7d") since.setDate(since.getDate() - 7);
    else if (period === "30d") since.setDate(since.getDate() - 30);
    else if (period === "1h") since.setHours(since.getHours() - 1);
    else since.setHours(since.getHours() - 24);

    const [
      totalUsers,
      totalOrgs,
      totalApiKeys,
      activeApiKeys,
      recentAuditEvents,
      activeSubscriptions,
      creditTxCount,
      creditTotal,
    ] = await Promise.all([
      prisma.users.count(),
      prisma.organizations.count(),
      prisma.apiKeys.count(),
      prisma.apiKeys.count({ where: { isActive: true } }),
      prisma.auditLogs.count({ where: { createdAt: { gte: since } } }),
      prisma.subscriptions.count({
        where: { status: "ACTIVE" },
      }),
      prisma.creditTransactions.count({
        where: { createdAt: { gte: since } },
      }),
      prisma.creditTransactions.aggregate({
        where: { createdAt: { gte: since }, amount: { lt: 0 } },
        _sum: { amount: true },
      }),
    ]);

    return NextResponse.json({
      data: {
        users: {
          total: totalUsers,
          totalOrgs,
        },
        api: {
          totalKeys: totalApiKeys,
          activeKeys: activeApiKeys,
        },
        audit: {
          recentEvents: recentAuditEvents,
        },
        billing: {
          activeSubscriptions,
          totalCreditTransactions: creditTxCount,
          totalCreditsUsed: Math.abs(creditTotal._sum.amount ?? 0),
        },
        period,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch system monitoring data",
      },
      { status: 500 }
    );
  }
}
