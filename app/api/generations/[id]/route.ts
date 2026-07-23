export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";

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

    const data = await prisma.generations.findFirst({
      where: { id, userId: user.id },
      include: { voiceProfile: { select: { id: true, name: true, tone: true } } },
    });

    if (!data) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    return NextResponse.json({ data: transformGeneration(data) });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(
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

    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    if (permanent) {
      await prisma.generations.deleteMany({
        where: { id, userId: user.id, deletedAt: { not: null } },
      });
    } else {
      await prisma.generations.updateMany({
        where: { id, userId: user.id },
        data: { deletedAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { action } = body;

    if (action === "restore") {
      await prisma.generations.updateMany({
        where: { id, userId: user.id },
        data: { deletedAt: null },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
