export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { voiceProfileSchema } from "@/lib/validations/voice";
import { embedVoiceProfile } from "@/lib/ai/embeddings";
import { cacheInvalidate, cacheKey } from "@/lib/utils/cache";

function transformVoice(vp: any) {
  return {
    id: vp.id,
    user_id: vp.userId,
    name: vp.name,
    description: vp.description,
    tone: vp.tone || "casual",
    example_posts: vp.examplePosts || [],
    embedding: null,
    is_default: vp.isDefault || false,
    is_favorite: vp.isFavorite || false,
    created_at: vp.createdAt?.toISOString?.() || vp.createdAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase();
    const sort = searchParams.get("sort") || "newest";
    const favorites = searchParams.get("favorites") === "true";

    const where: any = { userId: user.id };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tone: { contains: search, mode: "insensitive" } },
      ];
    }
    if (favorites) where.isFavorite = true;

    const orderBy: any =
      sort === "oldest" ? { createdAt: "asc" } :
      sort === "name" ? { name: "asc" } :
      { createdAt: "desc" };

    const data = await prisma.voiceProfiles.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, orderBy],
    });

    return NextResponse.json({ data: data.map(transformVoice) });
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

    const dbUser = await prisma.users.findUnique({ where: { id: user.id }, select: { plan: true } });
    const plan = (dbUser?.plan as string) || "free";
    const limits: Record<string, number> = { free: 1, starter: 3, pro: 999 };
    const maxProfiles = limits[plan] || 1;

    const count = await prisma.voiceProfiles.count({ where: { userId: user.id } });
    if (count >= maxProfiles) {
      throw new AppError(`Your plan allows ${maxProfiles} voice profile${maxProfiles > 1 ? "s" : ""}. Upgrade to add more.`, 403);
    }

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = voiceProfileSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(Object.values(parsed.error.flatten().fieldErrors).flat()[0] as string || "Invalid input", 400);
    }

    const { name, description, tone, example_posts, is_default } = parsed.data;

    const data = await prisma.voiceProfiles.create({
      data: {
        userId: user.id,
        name,
        description: description || null,
        tone: tone || "casual",
        examplePosts: example_posts || [],
        isDefault: is_default || false,
      },
    });

    if (data && example_posts.length > 0) {
      embedVoiceProfile(data.id, example_posts).catch(console.error);
    }

    return NextResponse.json({ data: transformVoice(data) }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const body = await parseBody<Record<string, unknown>>(request);
    const rawId = body.id;
    if (typeof rawId !== "string" || !rawId) throw new AppError("Profile ID is required", 400);
    const id: string = rawId;

    const parsed = voiceProfileSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(Object.values(parsed.error.flatten().fieldErrors).flat()[0] as string || "Invalid input", 400);
    }

    const { name, description, tone, example_posts, is_default, is_favorite } = parsed.data;

    const data = await prisma.voiceProfiles.update({
      where: { id, userId: user.id },
      data: {
        name,
        description: description || null,
        tone: tone || "casual",
        examplePosts: example_posts || [],
        isDefault: is_default || false,
        isFavorite: is_favorite || false,
      },
    });

    if (!data) throw new AppError("Voice profile not found", 404);

    if (example_posts.length > 0) {
      embedVoiceProfile(data.id, example_posts).catch(console.error);
    }

    return NextResponse.json({ data: transformVoice(data) });
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

    const body = await parseBody<Record<string, unknown>>(request);
    const id = body.id as string | undefined;
    const action = body.action as string | undefined;
    if (!id || !action) throw new AppError("ID and action required", 400);

    if (action === "set_default") {
      await prisma.voiceProfiles.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
      await prisma.voiceProfiles.update({
        where: { id, userId: user.id },
        data: { isDefault: true },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "toggle_favorite") {
      const vp = await prisma.voiceProfiles.findFirst({ where: { id, userId: user.id } });
      if (!vp) throw new AppError("Not found", 404);
      await prisma.voiceProfiles.update({
        where: { id },
        data: { isFavorite: !vp.isFavorite },
      });
      return NextResponse.json({ success: true, is_favorite: !vp.isFavorite });
    }

    throw new AppError("Invalid action", 400);
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
    if (!id) throw new AppError("Profile ID is required", 400);

    await prisma.voiceProfiles.deleteMany({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
