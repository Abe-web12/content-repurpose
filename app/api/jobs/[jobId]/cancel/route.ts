import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { AiJobManager } from "@/lib/ai/job";
import { AiQueue } from "@/lib/ai/queue";
import { rateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`jobs:cancel:${user.id}`, {
      windowMs: 60000,
      maxRequests: 10,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const result = await AiJobManager.cancelJob(jobId, user.id);
    await AiQueue.cancel(jobId);

    return NextResponse.json({ data: result });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
