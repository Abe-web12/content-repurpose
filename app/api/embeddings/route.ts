export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { embedVoiceProfile } from "@/lib/ai/embeddings";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const body = await request.json();
    const { voice_profile_id, example_posts } = body;

    if (!voice_profile_id || !example_posts?.length) {
      throw new AppError("Missing required fields", 400);
    }

    const vp = await prisma.voiceProfiles.findFirst({
      where: { id: voice_profile_id, userId: user.id },
      select: { id: true },
    });
    if (!vp) throw new AppError("Voice profile not found", 404);

    await embedVoiceProfile(voice_profile_id, example_posts);

    return NextResponse.json({ success: true });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
