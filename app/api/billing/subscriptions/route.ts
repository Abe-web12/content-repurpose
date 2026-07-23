import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { SubscriptionManager } from "@/lib/billing/subscription";
import { SubscriptionAutomation } from "@/lib/billing/automation";
import { rateLimit } from "@/lib/utils/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";

const changePlanSchema = z.object({
  action: z.enum(["change_plan", "cancel", "resume", "sync", "alerts", "proration_preview"]),
  plan: z.string().optional(),
  couponCode: z.string().optional(),
  atPeriodEnd: z.boolean().optional().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") ?? "my-subscription";

    if (action === "history") {
      const history = await SubscriptionManager.getSubscriptionHistory(user.id);
      return NextResponse.json({ data: history });
    }

    if (action === "alerts") {
      const alerts = await SubscriptionAutomation.getAlerts();
      return NextResponse.json({ data: alerts });
    }

    const subscription = await SubscriptionManager.getActiveSubscription(user.id);
    return NextResponse.json({ data: subscription });
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

    const limitResult = await rateLimit(`billing:subscriptions:${user.id}`, {
      windowMs: 60000, maxRequests: 15,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = changePlanSchema.safeParse(body);
    if (!validation.success) throw new AppError("Invalid input", 400);

    switch (validation.data.action) {
      case "change_plan":
        if (!validation.data.plan) throw new AppError("plan is required", 400);
        const result = await SubscriptionManager.changePlan(
          user.id,
          validation.data.plan,
          validation.data.couponCode,
        );
        return NextResponse.json({ data: result });

      case "cancel":
        await SubscriptionManager.cancelSubscription(user.id, validation.data.atPeriodEnd);
        return NextResponse.json({ data: { canceled: true } });

      case "resume":
        await SubscriptionManager.resumeSubscription(user.id);
        return NextResponse.json({ data: { resumed: true } });

      case "proration_preview":
        if (!validation.data.plan) throw new AppError("plan is required", 400);
        const preview = await SubscriptionManager.getProrationPreview(user.id, validation.data.plan);
        return NextResponse.json({ data: preview });

      case "sync":
        await SubscriptionManager.syncFromStripe(user.id);
        return NextResponse.json({ data: { synced: true } });

      default:
        throw new AppError("Invalid action", 400);
    }
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
