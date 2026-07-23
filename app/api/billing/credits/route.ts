import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { CreditManager } from "@/lib/billing/credits";
import { rateLimit } from "@/lib/utils/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";

const creditQuerySchema = z.object({
  action: z.enum(["balance", "history", "packages"]).default("balance"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  source: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const rl = await rateLimit(`credits:${user.id}`, { windowMs: 60000, maxRequests: 30 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const { searchParams } = new URL(request.url);
    const rawParams = {
      action: searchParams.get("action") ?? "balance",
      limit: searchParams.get("limit") ?? "50",
      offset: searchParams.get("offset") ?? "0",
      source: searchParams.get("source") ?? undefined,
    };
    const parsed = creditQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message || "Invalid query parameters", 400);
    }

    const { action, limit, offset, source } = parsed.data;

    switch (action) {
      case "balance": {
        const balance = await CreditManager.getBalance(user.id);
        const stats = await CreditManager.getStats(user.id);
        return NextResponse.json({ data: { ...balance, stats } });
      }
      case "history": {
        const history = await CreditManager.getHistory(user.id, { limit, offset, source });
        return NextResponse.json(history);
      }
      case "packages": {
        const packages = await CreditManager.getCreditPackages();
        return NextResponse.json({ data: packages });
      }
    }
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
