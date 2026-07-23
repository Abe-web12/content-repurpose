import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { RoutingEngine } from "@/lib/ai/routing-engine";
import type { ProviderName } from "@/lib/ai/orchestrator";
import { PromptOptimizer } from "@/lib/ai/prompt-optimizer";
import { QualityScorer } from "@/lib/ai/quality-scorer";
import { CreditManager } from "@/lib/billing/credits";
import { rateLimit } from "@/lib/utils/rate-limit";
import { requirePlan } from "@/lib/api/shared-middleware";
import { z } from "zod";

export const runtime = "nodejs";

const CREDIT_COST = 1;

const generateSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(50000),
  optimize: z.boolean().optional().default(false),
  qualityCheck: z.boolean().optional().default(false),
  autoImprove: z.boolean().optional().default(false),
  contentType: z.string().optional(),
  platform: z.string().optional(),
  tone: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  brandVoice: z.string().optional(),
  targetAudience: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(32000).optional(),
  forceProvider: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`ai:generate:${user.id}`, {
      windowMs: 60000,
      maxRequests: 30,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = generateSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(
        Object.values(validation.error.flatten().fieldErrors).flat()[0] as string || "Invalid input",
        400,
      );
    }

    const opts = validation.data;
    let prompt = opts.prompt;

    await requirePlan(user.id, { minTier: "free", feature: "generation" });

    const creditResult = await CreditManager.checkAndDeduct(user.id, CREDIT_COST, "GENERATION");
    if (!creditResult.success) {
      throw new AppError("Insufficient credits. Purchase more credits to continue generating.", 402);
    }

    if (opts.optimize) {
      const optimized = PromptOptimizer.optimize(prompt, {
        compressInstructions: true,
        removeRedundancy: true,
        useShorterSynonyms: true,
      });
      prompt = optimized.optimizedPrompt;
    }

    const result = await RoutingEngine.generateWithRouting(prompt, {
      contentType: opts.contentType,
      platform: opts.platform,
      userTier: undefined,
      userId: user.id,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
      forceProvider: opts.forceProvider as ProviderName,
    });

    const response: Record<string, unknown> = {
      content: result.content,
      model: result.model,
      provider: result.provider,
      latency: result.latency,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
      routingDecision: result.routingDecision,
    };

    if (opts.qualityCheck) {
      const quality = QualityScorer.score(result.content, {
        platform: opts.platform,
        tone: opts.tone,
        keywords: opts.keywords,
        brandVoice: opts.brandVoice,
        targetAudience: opts.targetAudience,
      });

      response.qualityScore = quality;

      if (opts.autoImprove && !QualityScorer.isPassing(quality)) {
        const improvement = await QualityScorer.autoImprove(result.content, quality);
        if (improvement.improved) {
          response.improvedContent = improvement.content;
          response.improvements = improvement.changes;
        }
      }
    }

    return NextResponse.json({ data: response });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
