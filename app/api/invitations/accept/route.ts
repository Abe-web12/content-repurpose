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
      include: { organization: true },
    });

    if (!invitation) throw new AppError("Invalid invitation token", 404);
    if (invitation.status !== "PENDING") throw new AppError("This invitation has already been processed", 400);
    if (invitation.expiresAt < new Date()) {
      await prisma.organizationInvitations.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      throw new AppError("This invitation has expired", 410);
    }
    if (invitation.email !== user.email) {
      throw new AppError("This invitation was sent to a different email address", 403);
    }

    const existingMember = await prisma.organizationMembers.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: user.id,
        },
      },
    });
    if (existingMember) throw new AppError("You are already a member of this organization", 409);

    await prisma.$transaction(async (tx) => {
      await tx.organizationMembers.create({
        data: {
          organizationId: invitation.organizationId,
          userId: user.id,
          role: invitation.role,
          invitedById: invitation.invitedById,
        },
      });
      await tx.organizationInvitations.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });
    });

    return NextResponse.json({
      data: {
        organizationId: invitation.organizationId,
        organizationName: invitation.organization.name,
        role: invitation.role,
      },
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
