export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sanitizeError, AppError, parseBody } from "@/lib/utils/api-errors";
import { z } from "zod";
import {
  type CursorPaginationParams,
  buildCursorWhere,
  getNextCursor,
} from "@/lib/utils/cursor-pagination";
import { cacheGet, cacheKey, cacheInvalidate } from "@/lib/utils/cache";

const notificationCreateSchema = z.object({
  type: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  link: z.string().max(500).optional().nullable(),
});

function transformNotification(n: any) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    read: n.read,
    user_id: n.userId,
    created_at: n.createdAt?.toISOString?.() || n.createdAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const cursor = searchParams.get("cursor") || undefined;
    const unread = searchParams.get("unread") === "true";

    const where: Record<string, unknown> = { userId: user.id };
    if (unread) where.read = false;

    const cursorWhere = buildCursorWhere(cursor, "createdAt", "desc");
    if (cursorWhere) {
      (where as any).createdAt = cursorWhere.createdAt;
    }

    const items = await prisma.notifications.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    const nextCursor = getNextCursor(data, "createdAt", limit);

    const count = await prisma.notifications.count({ where: { userId: user.id } });
    const unreadCount = await prisma.notifications.count({
      where: { userId: user.id, read: false },
    });

    return NextResponse.json({
      data: data.map(transformNotification),
      nextCursor,
      hasMore,
      count,
      unread_count: unreadCount,
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = notificationCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(Object.values(parsed.error.flatten().fieldErrors).flat()[0] as string || "Invalid input", 400);
    }

    const result = await prisma.notifications.create({
      data: {
        type: parsed.data.type,
        title: parsed.data.title,
        message: parsed.data.message,
        link: parsed.data.link || null,
        userId: user.id,
      },
    });

    return NextResponse.json({ data: transformNotification(result) }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const body = await request.json();
    const { action } = body;

    if (action === "mark_all_read") {
      await prisma.notifications.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    throw new AppError("Invalid action", 400);
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
