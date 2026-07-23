export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractSchema } from "@/lib/validations/generate";
import { extractContent } from "@/lib/extractors";
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

    const limit = await rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 20 });
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = extractSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { input, input_type } = validation.data;

    const result = await extractContent(input, input_type);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
