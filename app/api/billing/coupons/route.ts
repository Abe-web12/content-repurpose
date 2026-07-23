import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { CouponEngine } from "@/lib/billing/coupons";
import { rateLimit } from "@/lib/utils/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";

const validateSchema = z.object({
  code: z.string().min(1),
  plan: z.string().optional(),
  amount: z.number().optional(),
});

const createSchema = z.object({
  code: z.string().min(1).max(50),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().positive(),
  maxUses: z.number().int().min(0).optional(),
  maxPerUser: z.number().int().min(0).optional(),
  planRestrictions: z.array(z.string()).optional(),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`billing:coupons:${user.id}`, {
      windowMs: 60000, maxRequests: 30,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const body = await parseBody<Record<string, unknown>>(request);
    const action = (body as any).action ?? "validate";

    if (action === "validate") {
      const validation = validateSchema.safeParse(body);
      if (!validation.success) throw new AppError("Invalid input", 400);

      const result = await CouponEngine.validate(validation.data.code, {
        plan: validation.data.plan,
        userId: user.id,
        amount: validation.data.amount,
      });
      return NextResponse.json({ data: result });
    }

    if (action === "create") {
      const validation = createSchema.safeParse(body);
      if (!validation.success) throw new AppError("Invalid input", 400);

      const coupon = await CouponEngine.create({
        ...validation.data,
        startsAt: validation.data.startsAt ? new Date(validation.data.startsAt) : undefined,
        expiresAt: validation.data.expiresAt ? new Date(validation.data.expiresAt) : undefined,
      });
      return NextResponse.json({ data: coupon }, { status: 201 });
    }

    throw new AppError("Invalid action", 400);
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const coupons = await CouponEngine.list();
    return NextResponse.json({ data: coupons });
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
    const code = searchParams.get("code");
    if (!code) throw new AppError("code query parameter required", 400);

    await CouponEngine.delete(code);
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
