export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeContent } from "@/lib/ai/analyze";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
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
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const body = await request.json();
    const { content, source_type } = body;

    if (!content || content.length < 50) {
      return NextResponse.json(
        { error: "Content must be at least 50 characters." },
        { status: 400 }
      );
    }

    const result = await analyzeContent(content, source_type || "content");

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
