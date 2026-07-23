export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { templateSchema } from "@/lib/validations/template";
import { cacheGet, cacheKey, cacheInvalidate } from "@/lib/utils/cache";

function transformTemplate(t: any) {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    platform: t.platform,
    content: t.content,
    is_custom: t.isCustom,
    user_id: t.userId,
    created_at: t.createdAt?.toISOString?.() || t.createdAt,
    updated_at: t.updatedAt?.toISOString?.() || t.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const platform = searchParams.get("platform");

    const where: any = {
      OR: [
        { isCustom: false },
        { userId: user.id },
      ],
    };
    if (category) where.category = category;
    if (platform) where.platform = platform;

    const data = await prisma.contentTemplates.findMany({
      where,
      orderBy: [{ isCustom: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ data: data.map(transformTemplate) });
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
    const parsed = templateSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(Object.values(parsed.error.flatten().fieldErrors).flat()[0] as string || "Invalid input", 400);
    }

    const result = await prisma.contentTemplates.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        category: parsed.data.category,
        platform: parsed.data.platform,
        content: parsed.data.content,
        isCustom: true,
        userId: user.id,
      },
    });

    return NextResponse.json({ data: transformTemplate(result) }, { status: 201 });
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
    if (!id) throw new AppError("Template ID required", 400);

    const template = await prisma.contentTemplates.findFirst({
      where: { id, userId: user.id, isCustom: true },
    });
    if (!template) throw new AppError("Template not found", 404);

    await prisma.contentTemplates.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
