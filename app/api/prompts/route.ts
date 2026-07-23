import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { createPromptSchema } from "@/lib/validations/prompt";
import { encodeCursor, decodeCursor } from "@/lib/utils/cursor-pagination";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const member = await prisma.organizationMembers.findFirst({
      where: { userId: user.id },
    });
    if (!member) throw new AppError("No organization found", 404);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const tag = searchParams.get("tag") ?? undefined;
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

    const where: Record<string, unknown> = {
      organizationId: member.organizationId,
      deletedAt: null,
    };

    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (search) where.name = { contains: search, mode: "insensitive" };
    if (tag) where.tags = { has: tag };

    if (cursor) {
      const decoded = decodeCursor(cursor);
      const date = new Date(decoded);
      const cursorVal = isNaN(date.getTime()) ? decoded : date;
      where.createdAt = { lt: cursorVal };
    }

    const prompts = await prisma.promptTemplates.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        variables: { orderBy: { sortOrder: "asc" } },
        _count: { select: { versions: true, executions: true } },
      },
    });

    const hasMore = prompts.length > limit;
    const data = hasMore ? prompts.slice(0, limit) : prompts;
    const nextCursor = hasMore && data.length > 0
      ? encodeCursor(data[data.length - 1].createdAt)
      : null;

    return NextResponse.json({ data, nextCursor, hasMore });
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

    const member = await prisma.organizationMembers.findFirst({
      where: { userId: user.id },
    });
    if (!member) throw new AppError("No organization found", 404);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = createPromptSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(validation.error.errors.map((e) => e.message).join(", "), 400);
    }

    const { variables, ...promptData } = validation.data;

    const prompt = await prisma.promptTemplates.create({
      data: {
        ...promptData,
        organizationId: member.organizationId,
        userId: user.id,
        tags: promptData.tags ?? [],
        variables: variables
          ? { create: variables.map((v) => ({ ...v, options: v.options ?? [] })) }
          : undefined,
      },
      include: { variables: true, category: true },
    });

    return NextResponse.json({ data: prompt }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
