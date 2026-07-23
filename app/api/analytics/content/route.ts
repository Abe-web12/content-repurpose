export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { queryHandler } from "@/lib/api/shared-middleware";
import { format, subDays, startOfDay } from "date-fns";

export const GET = queryHandler({
  rateLimit: { windowMs: 60_000, maxRequests: 30 },
  name: "analytics.content",
  handler: async (request: NextRequest, ctx) => {
    const { searchParams } = new URL(request.url);
    const days = Math.min(Math.max(parseInt(searchParams.get("days") || "30"), 1), 365);
    const startDate = startOfDay(subDays(new Date(), days));

    const generations = await prisma.generations.findMany({
      where: { userId: ctx.userId, createdAt: { gte: startDate }, deletedAt: null },
      select: {
        id: true,
        outputFormat: true,
        inputType: true,
        tokensUsed: true,
        modelUsed: true,
        isFavorite: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const totalGenerations = generations.length;
    const byFormat: Record<string, number> = {};
    const byInputType: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    let totalTokens = 0;
    let favoriteCount = 0;

    for (const g of generations) {
      if (g.outputFormat) byFormat[g.outputFormat] = (byFormat[g.outputFormat] ?? 0) + 1;
      if (g.inputType) byInputType[g.inputType] = (byInputType[g.inputType] ?? 0) + 1;
      if (g.modelUsed) byModel[g.modelUsed] = (byModel[g.modelUsed] ?? 0) + 1;
      totalTokens += g.tokensUsed ?? 0;
      if (g.isFavorite) favoriteCount++;
    }

    const dailyMap = new Map<string, number>();
    for (let i = days; i >= 0; i--) {
      dailyMap.set(format(subDays(new Date(), i), "yyyy-MM-dd"), 0);
    }
    for (const g of generations) {
      const d = format(g.createdAt, "yyyy-MM-dd");
      dailyMap.set(d, (dailyMap.get(d) ?? 0) + 1);
    }
    const dailySeries = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      data: {
        totalGenerations,
        totalTokens,
        favoriteCount,
        byFormat,
        byInputType,
        byModel,
        dailySeries,
      },
    });
  },
});
