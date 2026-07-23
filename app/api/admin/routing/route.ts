import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { RoutingEngine } from "@/lib/ai/routing-engine";
import { rateLimit } from "@/lib/utils/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";

const ruleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  condition: z.enum(["content_type", "content_length", "platform", "user_tier", "time_of_day", "random"]),
  operator: z.enum(["equals", "contains", "gt", "lt", "gte", "lte", "in"]),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
  provider: z.string().min(1),
  strategy: z.enum(["auto", "cheapest", "fastest", "quality", "user_preference"]),
  weight: z.number().min(1).optional().default(1),
  priority: z.number().int().optional().default(0),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const rules = await RoutingEngine.getRules();
    return NextResponse.json({ data: rules });
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

    const limitResult = await rateLimit(`admin:routing:${user.id}`, {
      windowMs: 60000,
      maxRequests: 20,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = ruleSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(
        Object.values(validation.error.flatten().fieldErrors).flat()[0] as string || "Invalid input",
        400,
      );
    }

    const rule = {
      ...validation.data,
      id: validation.data.id ?? crypto.randomUUID(),
    };

    await RoutingEngine.addRule(rule as any);
    return NextResponse.json({ data: rule }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("ruleId");
    if (!ruleId) throw new AppError("ruleId query parameter is required", 400);

    await RoutingEngine.removeRule(ruleId);
    return NextResponse.json({ data: { deleted: true, ruleId } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
