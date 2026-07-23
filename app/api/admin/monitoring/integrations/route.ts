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
      totalIntegrations,
      installedCount,
      activeConnections,
      errorCount,
      syncCount,
      recentLogs,
      webhookStats,
      perType,
    ] = await Promise.all([
      prisma.integrations.count(),
      prisma.installedIntegrations.count(),
      prisma.installedIntegrations.count({
        where: { status: "CONNECTED" },
      }),
      prisma.installedIntegrations.count({
        where: { status: "ERROR" },
      }),
      prisma.installedIntegrations.count({
        where: { lastSyncAt: { gte: since } },
      }),
      prisma.integrationLogs.count({
        where: { createdAt: { gte: since }, level: "error" },
      }),
      prisma.integrationWebhooks.aggregate({
        _sum: { failureCount: true },
        _count: { isActive: true },
      }),
      prisma.installedIntegrations.groupBy({
        by: ["integrationKey"],
        _count: { integrationKey: true },
        orderBy: { _count: { integrationKey: "desc" } },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      data: {
        summary: {
          totalIntegrations,
          installedCount,
          activeConnections,
          errorCount,
          syncCount,
          recentErrors: recentLogs,
        },
        webhooks: {
          total: webhookStats._count.isActive,
          totalFailures: webhookStats._sum.failureCount ?? 0,
        },
        topIntegrations: perType.map((t) => ({
          key: t.integrationKey,
          count: t._count.integrationKey,
        })),
        period,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch integration monitoring data" },
      { status: 500 }
    );
  }
}
