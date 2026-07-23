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
      totalJobs,
      successful,
      failed,
      totalTokens,
      totalCost,
      avgDuration,
      queueDepth,
    ] = await Promise.all([
      prisma.aiJobs.count({ where: { createdAt: { gte: since } } }),
      prisma.aiJobs.count({
        where: { createdAt: { gte: since }, status: "COMPLETED" },
      }),
      prisma.aiJobs.count({
        where: { createdAt: { gte: since }, status: "FAILED" },
      }),
      prisma.aiJobs.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { totalTokens: true },
      }),
      prisma.aiJobs.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { estimatedCost: true },
      }),
      prisma.aiJobs.aggregate({
        where: { createdAt: { gte: since }, status: "COMPLETED" },
        _avg: { duration: true },
      }),
      prisma.aiJobs.count({ where: { status: "QUEUED" } }),
    ]);

    const providerStats = await prisma.aiJobs.groupBy({
      by: ["provider"],
      where: { createdAt: { gte: since } },
      _count: { provider: true },
      _sum: { totalTokens: true, estimatedCost: true },
      _avg: { duration: true },
      orderBy: { _count: { provider: "desc" } },
    });

    return NextResponse.json({
      data: {
        summary: {
          totalJobs,
          successful,
          failed,
          successRate:
            totalJobs > 0
              ? Math.round((successful / totalJobs) * 100)
              : 100,
          totalTokens: totalTokens._sum.totalTokens ?? 0,
          totalCost: totalCost._sum.estimatedCost ?? 0,
          avgDuration: Math.round(avgDuration._avg.duration ?? 0),
          queueDepth,
        },
        byProvider: providerStats.map((p) => ({
          provider: p.provider,
          requests: p._count.provider,
          tokens: p._sum.totalTokens ?? 0,
          cost: p._sum.estimatedCost ?? 0,
          avgDuration: Math.round(p._avg.duration ?? 0),
        })),
        period,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch AI monitoring data",
      },
      { status: 500 }
    );
  }
}
