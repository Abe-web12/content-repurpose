export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new AppError("Unauthorized", 401);

    const dbUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        plan: true,
        generationsUsed: true,
        generationsLimit: true,
        name: true,
        fullName: true,
        avatarUrl: true,
        email: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!dbUser) throw new AppError("Profile not found", 404);

    return NextResponse.json({
      data: {
        ...dbUser,
        generations_used: dbUser.generationsUsed,
        generations_limit: dbUser.generationsLimit,
        full_name: dbUser.fullName,
        avatar_url: dbUser.avatarUrl,
        stripe_customer_id: dbUser.stripeCustomerId,
        stripe_subscription_id: dbUser.stripeSubscriptionId,
        created_at: dbUser.createdAt?.toISOString?.() || dbUser.createdAt,
        updated_at: dbUser.updatedAt?.toISOString?.() || dbUser.updatedAt,
      },
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
