export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await prisma.voiceProfiles.findFirst({
      where: { id, userId: user.id },
    });

    if (!data) {
      return NextResponse.json({ error: "Voice profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: data.id,
        user_id: data.userId,
        name: data.name,
        description: data.description,
        tone: data.tone || "casual",
        example_posts: data.examplePosts || [],
        embedding: null,
        is_default: data.isDefault || false,
        created_at: data.createdAt?.toISOString?.() || data.createdAt,
      },
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
