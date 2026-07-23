export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { cacheGet, cacheKey, cacheInvalidate } from "@/lib/utils/cache";
import {
  type CursorPaginationParams,
  buildCursorWhere,
  getNextCursor,
} from "@/lib/utils/cursor-pagination";

function transformGeneration(gen: any) {
  return {
    id: gen.id,
    user_id: gen.userId,
    input_type: gen.inputType || "raw_text",
    input_content: gen.inputContent || "",
    extracted_content: gen.extractedContent || null,
    output_format: gen.outputFormat || "linkedin_post",
    output_content: gen.outputContent || gen.content || "",
    voice_profile_id: gen.voiceProfileId || null,
    voice_profile: gen.voiceProfile || null,
    tokens_used: gen.tokensUsed || null,
    model_used: gen.modelUsed || null,
    is_favorite: gen.isFavorite || false,
    created_at: gen.createdAt?.toISOString?.() || gen.createdAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const cursor = searchParams.get("cursor") || undefined;
    const format = searchParams.get("format");
    const favorites = searchParams.get("favorites") === "true";
    const trash = searchParams.get("trash") === "true";
    const search = searchParams.get("search")?.toLowerCase();
    const sort = searchParams.get("sort") || "newest";

    const where: any = { userId: user.id };
    if (trash) {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }
    if (format && format !== "all") where.outputFormat = format;
    if (favorites) where.isFavorite = true;
    if (search) {
      where.OR = [
        { content: { contains: search, mode: "insensitive" } },
        { outputContent: { contains: search, mode: "insensitive" } },
        { outputFormat: { contains: search, mode: "insensitive" } },
      ];
    }

    const sortDir = sort === "oldest" ? "asc" : "desc" as const;
    const cursorWhere = buildCursorWhere(cursor, "createdAt", sortDir);
    if (cursorWhere) {
      where.createdAt = cursorWhere.createdAt;
    }

    const data = await prisma.generations.findMany({
      where,
      include: { voiceProfile: { select: { id: true, name: true, tone: true } } },
      orderBy: { createdAt: sortDir },
      take: limit + 1,
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;
    const nextCursor = getNextCursor(items, "createdAt", limit);

    return NextResponse.json({
      data: items.map(transformGeneration),
      nextCursor,
      hasMore,
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) throw new AppError("Generation ID is required", 400);

    const generation = await prisma.generations.findFirst({
      where: { id, userId: user.id },
    });
    if (!generation) throw new AppError("Generation not found", 404);

    await prisma.generations.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
