import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { AiJobManager } from "@/lib/ai/job";
import { rateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`jobs:get:${user.id}`, {
      windowMs: 60000,
      maxRequests: 60,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const job = await AiJobManager.getJob(jobId, user.id);

    return NextResponse.json({ data: job });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
