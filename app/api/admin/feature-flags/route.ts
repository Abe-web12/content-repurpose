import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { FeatureFlags } from "@/lib/feature-flags";
import { rateLimit } from "@/lib/utils/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";

const flagSchema = z.object({
  key: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional().default(false),
  scope: z.enum(["GLOBAL", "PLAN", "USER", "ORGANIZATION"]).optional().default("GLOBAL"),
  scopeId: z.string().optional(),
  percentage: z.number().min(0).max(100).optional().default(100),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const flags = await FeatureFlags.getAllFlags();
    return NextResponse.json({ data: flags });
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

    const limitResult = await rateLimit(`admin:flags:${user.id}`, {
      windowMs: 60000,
      maxRequests: 20,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = flagSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(
        Object.values(validation.error.flatten().fieldErrors).flat()[0] as string || "Invalid input",
        400,
      );
    }

    const { key, ...data } = validation.data;
    await FeatureFlags.setFlag(key, data);

    return NextResponse.json({ data: { key, ...data } }, { status: 201 });
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
    const key = searchParams.get("key");
    if (!key) throw new AppError("key query parameter is required", 400);

    await FeatureFlags.deleteFlag(key);
    return NextResponse.json({ data: { deleted: true, key } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
