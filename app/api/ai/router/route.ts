import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { ProviderRouter } from "@/lib/ai/provider-router";
import type { ChatParams } from "@/lib/ai/provider-interface";
import { z } from "zod";

export const runtime = "nodejs";

const routeSchema = z.object({
  messages: z.array(z.object({ role: z.string(), content: z.any() })).min(1),
  model: z.string().optional(),
  strategy: z.enum(["auto", "cheapest", "fastest", "quality", "priority"]).optional().default("auto"),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(32000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`ai:router:${user.id}`, {
      windowMs: 60000,
      maxRequests: 60,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = routeSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(
        Object.values(validation.error.flatten().fieldErrors).flat()[0] as string || "Invalid input",
        400,
      );
    }

    const opts = validation.data;

    const { provider, result } = await ProviderRouter.route(
      {
        messages: opts.messages as ChatParams["messages"],
        model: opts.model,
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
      },
      { strategy: opts.strategy }
    );

    return NextResponse.json({
      data: {
        ...result,
        provider: provider.name,
        providerDisplayName: provider.displayName,
        strategy: opts.strategy,
      },
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
