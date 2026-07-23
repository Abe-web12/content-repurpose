import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { AICostTracker } from "@/lib/ai/provider-cost";
import { AIManager } from "@/lib/ai/provider-manager";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`ai:cost:${user.id}`, {
      windowMs: 60000,
      maxRequests: 30,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId") || undefined;
    const model = searchParams.get("model");

    if (providerId && model) {
      const cost = await AIManager.getModelCost(providerId, model);
      return NextResponse.json({ data: cost });
    }

    const startDate = searchParams.get("startDate") || new Date(Date.now() - 30 * 86400000).toISOString();
    const endDate = searchParams.get("endDate") || new Date().toISOString();

    const costs = await AICostTracker.getCostsByDateRange({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    return NextResponse.json({ data: costs });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
