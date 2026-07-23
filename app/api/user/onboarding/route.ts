export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sanitizeError, AppError, parseBody } from "@/lib/utils/api-errors";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const dbUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { onboardingCompleted: true, onboardingStep: true },
    });

    return NextResponse.json({
      data: {
        completed: dbUser?.onboardingCompleted ?? false,
        step: dbUser?.onboardingStep ?? "welcome",
      },
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const body = await parseBody<Record<string, unknown>>(request);
    const { step, completed } = body;

    const updateData: Record<string, boolean | string> = {};
    if (step && typeof step === "string") updateData.onboardingStep = step;
    if (completed === true) updateData.onboardingCompleted = true;

    await prisma.users.update({
      where: { id: user.id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
