import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { createJobSchema, jobQuerySchema } from "@/lib/validations/jobs";
import { AiJobManager } from "@/lib/ai/job";
import { AiQueue } from "@/lib/ai/queue";
import { rateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`jobs:list:${user.id}`, {
      windowMs: 60000,
      maxRequests: 60,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const { searchParams } = new URL(request.url);
    const query = jobQuerySchema.safeParse({
      status: searchParams.get("status"),
      limit: searchParams.get("limit"),
      cursor: searchParams.get("cursor"),
    });

    if (!query.success) {
      throw new AppError(query.error.errors.map((e) => e.message).join(", "), 400);
    }

    const result = await AiJobManager.listJobs(user.id, query.data);

    return NextResponse.json(result);
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`jobs:create:${user.id}`, {
      windowMs: 60000,
      maxRequests: 20,
    });
    if (!limitResult.success) throw new AppError("Too many requests. Please slow down.", 429);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = createJobSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(
        Object.values(validation.error.flatten().fieldErrors).flat()[0] as string || "Invalid input",
        400,
      );
    }

    const job = await AiJobManager.create({
      userId: user.id,
      inputContent: validation.data.content,
      outputFormat: validation.data.output_format,
      voiceProfileId: validation.data.voice_profile_id ?? null,
      brandKitId: validation.data.brand_kit_id ?? null,
      priority: validation.data.priority,
    });

    await AiQueue.enqueue(job.id, user.id, validation.data.priority);

    return NextResponse.json({ data: job }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
