import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { AiHealthMonitor } from "@/lib/ai/health-monitor";
import { z } from "zod";

export const runtime = "nodejs";

const actionSchema = z.object({
  action: z.enum(["reset", "enable", "disable", "recover"]),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { name } = await params;
    const health = await AiHealthMonitor.getProviderHealth(name);
    if (!health) throw new AppError("Provider not found", 404);

    return NextResponse.json({ data: { provider: name, ...health } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { name } = await params;
    const body = await parseBody<Record<string, unknown>>(request);
    const validation = actionSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError("Invalid action. Use: reset, enable, disable, or recover", 400);
    }

    switch (validation.data.action) {
      case "reset":
        await AiHealthMonitor.resetProvider(name);
        break;
      case "enable":
        await AiHealthMonitor.enableProvider(name);
        break;
      case "disable":
        await AiHealthMonitor.disableProvider(name);
        break;
      case "recover":
        await AiHealthMonitor.recoverProviders();
        break;
    }

    return NextResponse.json({ data: { provider: name, action: validation.data.action, success: true } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
