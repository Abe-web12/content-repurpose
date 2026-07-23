import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { QualityScorer } from "@/lib/ai/quality-scorer";
import { rateLimit } from "@/lib/utils/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";

const qualitySchema = z.object({
  content: z.string().min(1).max(50000),
  platform: z.string().optional(),
  tone: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  brandVoice: z.string().optional(),
  targetAudience: z.string().optional(),
  originalContent: z.string().optional(),
  autoImprove: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`ai:quality:${user.id}`, {
      windowMs: 60000,
      maxRequests: 60,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = qualitySchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(
        Object.values(validation.error.flatten().fieldErrors).flat()[0] as string || "Invalid input",
        400,
      );
    }

    const opts = validation.data;
    const score = QualityScorer.score(opts.content, {
      platform: opts.platform,
      tone: opts.tone,
      keywords: opts.keywords,
      brandVoice: opts.brandVoice,
      targetAudience: opts.targetAudience,
      originalContent: opts.originalContent,
    });

    const response: Record<string, unknown> = {
      score,
      passed: QualityScorer.isPassing(score),
    };

    if (opts.autoImprove && !QualityScorer.isPassing(score)) {
      const improvement = await QualityScorer.autoImprove(opts.content, score);
      response.improvement = improvement;
    }

    return NextResponse.json({ data: response });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
