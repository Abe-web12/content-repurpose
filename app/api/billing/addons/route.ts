import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { AddonManager } from "@/lib/billing/addons";
import { rateLimit } from "@/lib/utils/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";

const purchaseSchema = z.object({
  addonId: z.string(),
  couponCode: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") ?? "list";

    if (action === "history") {
      const history = await AddonManager.getPurchaseHistory(user.id);
      return NextResponse.json({ data: history });
    }

    const addons = await AddonManager.listAvailable(user.id);
    return NextResponse.json({ data: addons });
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

    const limitResult = await rateLimit(`billing:addons:${user.id}`, {
      windowMs: 60000, maxRequests: 10,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = purchaseSchema.safeParse(body);
    if (!validation.success) throw new AppError("Invalid input", 400);

    const result = await AddonManager.purchaseCreditsAddon(
      user.id,
      validation.data.addonId,
      { couponCode: validation.data.couponCode },
    );

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
