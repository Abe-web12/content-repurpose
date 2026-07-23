import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatch";
import { sanitizeError, AppError, parseBody } from "@/lib/utils/api-errors";

function transformPost(post: any) {
  return {
    ...post,
    platform: post.platform === "LINKEDIN" ? "linkedin" : post.platform === "TWITTER" ? "twitter" : "other",
    status: post.status === "PENDING" ? "scheduled" : post.status === "PUBLISHED" ? "posted" : post.status === "FAILED" ? "posted" : "draft",
    scheduled_at: post.scheduledAt?.toISOString?.() || post.scheduledAt,
    created_at: post.createdAt?.toISOString?.() || post.createdAt,
    updated_at: post.updatedAt?.toISOString?.() || post.updatedAt,
  };
}

const VALID_PLATFORMS = ["linkedin", "twitter", "blog", "other"] as const;
const VALID_STATUSES = ["draft", "scheduled", "posted"] as const;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new AppError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

    const where: Record<string, unknown> = { userId: user.id };
    if (status === "scheduled") where.status = "PENDING";
    else if (status === "posted") where.status = "PUBLISHED";
    else if (status === "draft") where.status = "PENDING";

    const data = await prisma.scheduledPosts.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      take: limit,
    });

    return NextResponse.json({ data: data.map(transformPost) });
  } catch (err) {
    console.error("Schedule GET error:", err);
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 30 });
    if (!limitResult.success) {
      throw new AppError("Too many requests.", 429);
    }

    const body = await parseBody<Record<string, unknown>>(request);
    const { content, platform, scheduled_at, status: postStatus } = body;

    if (!content || !platform || !scheduled_at) {
      throw new AppError("Missing required fields: content, platform, scheduled_at", 400);
    }

    if (!VALID_PLATFORMS.includes(platform as any)) {
      throw new AppError("Invalid platform. Must be one of: linkedin, twitter, blog, other", 400);
    }

    if (postStatus && !VALID_STATUSES.includes(postStatus as any)) {
      throw new AppError("Invalid status. Must be one of: draft, scheduled, posted", 400);
    }

    const scheduledDate = new Date(scheduled_at as string);
    if (isNaN(scheduledDate.getTime())) {
      throw new AppError("Invalid scheduled_at date", 400);
    }

    const platformEnum = platform === "linkedin" ? "LINKEDIN" : "TWITTER";
    const statusEnum = postStatus === "scheduled" ? "PENDING" : postStatus === "posted" ? "PUBLISHED" : "PENDING";

    const data = await prisma.scheduledPosts.create({
      data: {
        userId: user.id,
        content: content as string,
        platform: platformEnum as any,
        scheduledAt: scheduledDate,
        status: statusEnum as any,
      },
    });

    dispatchWebhookEvent(user.id, "schedule.created", {
      post_id: data.id,
      platform: data.platform,
      scheduled_at: data.scheduledAt.toISOString(),
      content_preview: (data.content as string).slice(0, 200),
    }).catch(() => {});

    return NextResponse.json({ data: transformPost(data) }, { status: 201 });
  } catch (err) {
    console.error("Schedule POST error:", err);
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
    const { id, ...updates } = body;

    if (!id) {
      throw new AppError("Post ID is required", 400);
    }

    const existing = await prisma.scheduledPosts.findFirst({
      where: { id: id as string, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      throw new AppError("Scheduled post not found", 404);
    }

    const allowedFields: Record<string, boolean> = {
      content: true,
      platform: true,
      scheduled_at: true,
      status: true,
    };

    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields[key]) {
        if (key === "platform" && !VALID_PLATFORMS.includes(value as any)) {
          throw new AppError("Invalid platform", 400);
        }
        if (key === "status" && !VALID_STATUSES.includes(value as any)) {
          throw new AppError("Invalid status", 400);
        }
        cleanUpdates[key] = value;
      }
    }

    if (Object.keys(cleanUpdates).length === 0) {
      throw new AppError("No valid fields to update", 400);
    }

    const prismaUpdate: Record<string, unknown> = {};
    if (cleanUpdates.content) prismaUpdate.content = cleanUpdates.content;
    if (cleanUpdates.platform) prismaUpdate.platform = cleanUpdates.platform === "linkedin" ? "LINKEDIN" : "TWITTER";
    if (cleanUpdates.scheduled_at) prismaUpdate.scheduledAt = new Date(cleanUpdates.scheduled_at as string);
    if (cleanUpdates.status) {
      prismaUpdate.status = cleanUpdates.status === "posted" ? "PUBLISHED" : "PENDING";
    }

    const data = await prisma.scheduledPosts.update({
      where: { id: id as string },
      data: prismaUpdate,
    });

    return NextResponse.json({ data: transformPost(data) });
  } catch (err) {
    console.error("Schedule PATCH error:", err);
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

    if (!id) {
      throw new AppError("Post ID is required", 400);
    }

    await prisma.scheduledPosts.deleteMany({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Schedule DELETE error:", err);
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
