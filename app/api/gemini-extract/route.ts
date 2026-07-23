export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { extractKeyPoints } from "@/lib/ai/gemini-provider";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = await rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 15 });
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { transcript } = body;

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "Transcript is required and must be a string." },
        { status: 400 }
      );
    }

    if (transcript.length < 50) {
      return NextResponse.json(
        { error: "Transcript must be at least 50 characters." },
        { status: 400 }
      );
    }

    const extraction = await extractKeyPoints(transcript);

    return NextResponse.json({
      success: true,
      data: extraction,
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
