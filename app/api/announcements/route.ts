export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/utils/api-errors";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

    const where: Record<string, unknown> = { published: true };
    if (category) where.category = category;

    const announcements = await prisma.featureAnnouncements.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      data: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        category: a.category,
        created_at: a.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
