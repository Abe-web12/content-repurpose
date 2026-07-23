import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { token } = await request.json().catch(() => ({}));
    if (!token || typeof token !== "string") throw new AppError("Token is required", 400);

    const invitation = await prisma.organizationInvitations.findUnique({
      where: { token },
    });

    if (!invitation) throw new AppError("Invalid invitation token", 404);
    if (invitation.status !== "PENDING") throw new AppError("This invitation has already been processed", 400);
    if (invitation.email !== user.email) {
      throw new AppError("This invitation was sent to a different email address", 403);
    }

    await prisma.organizationInvitations.update({
      where: { id: invitation.id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
