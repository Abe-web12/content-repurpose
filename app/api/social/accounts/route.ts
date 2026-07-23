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

    const accounts = await prisma.socialAccounts.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        provider: true,
        providerUserId: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      data: accounts.map((a) => ({
        id: a.id,
        provider: a.provider,
        provider_user_id: a.providerUserId,
        scopes: a.scopes,
        expires_at: a.expiresAt?.toISOString() || null,
        created_at: a.createdAt.toISOString(),
        is_expired: a.expiresAt ? new Date() >= a.expiresAt : false,
      })),
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
