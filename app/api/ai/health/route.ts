import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { AIHealthMonitor } from "@/lib/ai/provider-health";
import { rateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`ai:health:${user.id}`, {
      windowMs: 60000,
      maxRequests: 20,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const healthData = await AIHealthMonitor.getAllProviderHealth();
    return NextResponse.json({ data: healthData });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
