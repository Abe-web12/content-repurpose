import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { getOrgSession, requirePermission } from "@/lib/utils/org-access";
import { inviteMemberSchema } from "@/lib/validations/organization";
import { canManageRole } from "@/lib/constants/roles";
import type { Role } from "@/lib/constants/roles";
import crypto from "crypto";

export const runtime = "nodejs";

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await params;
    const session = await getOrgSession(orgId);
    requirePermission(session, "read");

    const invitations = await prisma.organizationInvitations.findMany({
      where: { organizationId: orgId },
      include: {
        invitedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: invitations });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await params;
    const session = await getOrgSession(orgId);
    requirePermission(session, "manage_members");

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = inviteMemberSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(validation.error.errors.map((e) => e.message).join(", "), 400);
    }

    const { email, role } = validation.data;

    if (!canManageRole(session.member.role as Role, role)) {
      throw new AppError("You cannot invite a member with a role equal to or higher than your own", 403);
    }

    const existingMember = await prisma.organizationMembers.findFirst({
      where: {
        organizationId: orgId,
        user: { email },
      },
    });
    if (existingMember) throw new AppError("This user is already a member of the organization", 409);

    const existingInvitation = await prisma.organizationInvitations.findFirst({
      where: {
        organizationId: orgId,
        email,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });
    if (existingInvitation) throw new AppError("An active invitation already exists for this email", 409);

    const invitation = await prisma.organizationInvitations.create({
      data: {
        email,
        role,
        token: generateToken(),
        organizationId: orgId,
        invitedById: session.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({ data: invitation }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await params;
    const session = await getOrgSession(orgId);
    requirePermission(session, "manage_members");

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("invitationId");
    if (!invitationId) throw new AppError("invitationId is required", 400);

    const invitation = await prisma.organizationInvitations.findUnique({
      where: { id: invitationId },
    });
    if (!invitation || invitation.organizationId !== orgId) {
      throw new AppError("Invitation not found", 404);
    }

    await prisma.organizationInvitations.delete({ where: { id: invitationId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
