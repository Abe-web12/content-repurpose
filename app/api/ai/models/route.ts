import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { AIManager } from "@/lib/ai/provider-manager";
import { z } from "zod";

export const runtime = "nodejs";

const upsertModelSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  providerId: z.string().min(1),
  capabilities: z.array(z.string()).optional(),
  costPerInput: z.number().min(0).optional(),
  costPerOutput: z.number().min(0).optional(),
  costPerCached: z.number().min(0).optional(),
  contextWindow: z.number().int().positive().optional(),
  maxTokens: z.number().int().positive().optional(),
  isEnabled: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId") || undefined;

    const models = await AIManager.getModels(providerId);
    return NextResponse.json({ data: models });
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

    const limitResult = await rateLimit(`ai:models:${user.id}`, {
      windowMs: 60000,
      maxRequests: 20,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = upsertModelSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(
        Object.values(validation.error.flatten().fieldErrors).flat()[0] as string || "Invalid input",
        400,
      );
    }

    const data = validation.data;
    const model = await AIManager.upsertModel(data);
    return NextResponse.json({ data: model }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
