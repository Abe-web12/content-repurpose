import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { CouponEngine } from "@/lib/billing/coupons";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { code } = await params;
    const { searchParams } = new URL(request.url);
    const active = searchParams.get("active");

    if (active !== null) {
      await CouponEngine.toggle(code, active === "true");
    }

    return NextResponse.json({ data: { code, toggled: true } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
