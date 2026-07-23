import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { AiOrchestrator } from "@/lib/ai/orchestrator";
import { AiHealthMonitor } from "@/lib/ai/health-monitor";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const providers = await AiOrchestrator.listProviders();

    const healthData = await AiHealthMonitor.getAllProviderHealth();
    const healthMap = new Map(healthData.map((h) => [h.provider, h.health]));

    const enriched = providers.map((p) => ({
      ...p,
      health: healthMap.get(p.name) ?? null,
    }));

    return NextResponse.json({ data: enriched });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
