export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const original = await prisma.generations.findFirst({
      where: { id, userId: user.id },
    });
    if (!original) return NextResponse.json({ error: "Generation not found" }, { status: 404 });

    const duplicate = await prisma.generations.create({
      data: {
        userId: user.id,
        content: original.content,
        inputType: original.inputType,
        inputContent: original.inputContent,
        extractedContent: original.extractedContent,
        outputFormat: original.outputFormat,
        outputContent: original.outputContent,
        voiceProfileId: original.voiceProfileId,
        title: original.title ? `${original.title} (Copy)` : null,
        modelUsed: original.modelUsed,
      },
    });

    return NextResponse.json({
      data: {
        id: duplicate.id,
        created_at: duplicate.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
