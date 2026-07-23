import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { PromptOptimizer } from "@/lib/ai/prompt-optimizer";
import { rateLimit } from "@/lib/utils/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";

const optimizeSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(50000),
  doublePass: z.boolean().optional().default(false),
  config: z.object({
    removeExcessWhitespace: z.boolean().optional(),
    compressInstructions: z.boolean().optional(),
    removeRedundancy: z.boolean().optional(),
    useShorterSynonyms: z.boolean().optional(),
    restructureAsBullets: z.boolean().optional(),
    maxLength: z.number().positive().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`ai:optimize:${user.id}`, {
      windowMs: 60000,
      maxRequests: 60,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = optimizeSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(
        Object.values(validation.error.flatten().fieldErrors).flat()[0] as string || "Invalid input",
        400,
      );
    }

    const opts = validation.data;
    let result;

    if (opts.doublePass) {
      result = await PromptOptimizer.optimizeWithAI(opts.prompt);
    } else {
      result = PromptOptimizer.optimize(opts.prompt, opts.config);
    }

    return NextResponse.json({
      data: result,
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
