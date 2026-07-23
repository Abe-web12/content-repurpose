import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { getOrgSession, requirePermission } from "@/lib/utils/org-access";
import { updateMemberRoleSchema, transferOwnershipSchema } from "@/lib/validations/organization";
import { canManageRole, ROLE_HIERARCHY } from "@/lib/constants/roles";
import type { Role } from "@/lib/constants/roles";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await params;
    const session = await getOrgSession(orgId);
    requirePermission(session, "read");

    const members = await prisma.organizationMembers.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });

    const formatted = members.map((m) => ({
      id: m.id,
      role: m.role,
      userId: m.userId,
      joinedAt: m.joinedAt,
      user: {
        id: m.user.id,
        email: m.user.email,
        name: m.user.fullName || m.user.name || m.user.email,
        avatarUrl: m.user.avatarUrl,
      },
      invitedBy: m.invitedBy
        ? { id: m.invitedBy.id, name: m.invitedBy.name || m.invitedBy.email }
        : null,
    }));

    return NextResponse.json({ data: formatted });
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
    const memberId = searchParams.get("memberId");
    if (!memberId) throw new AppError("memberId is required", 400);

    const target = await prisma.organizationMembers.findUnique({
      where: { id: memberId },
    });
    if (!target || target.organizationId !== orgId) {
      throw new AppError("Member not found", 404);
    }
    if (target.role === "OWNER") {
      throw new AppError("Cannot remove the organization owner", 400);
    }
    if (!canManageRole(session.member.role as Role, target.role as Role)) {
      throw new AppError("You cannot remove a member with a higher or equal role", 403);
    }

    await prisma.organizationMembers.delete({ where: { id: memberId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await params;
    const session = await getOrgSession(orgId);

    const body = await parseBody<Record<string, unknown>>(request);
    const url = new URL(request.url);
    const memberId = url.searchParams.get("memberId");
    if (!memberId) throw new AppError("memberId is required", 400);

    const target = await prisma.organizationMembers.findUnique({
      where: { id: memberId },
    });
    if (!target || target.organizationId !== orgId) {
      throw new AppError("Member not found", 404);
    }

    if (body.action === "transfer-ownership") {
      requirePermission(session, "manage_organization");
      if (session.member.role !== "OWNER") {
        throw new AppError("Only the owner can transfer ownership", 403);
      }
      if (target.role === "OWNER") {
        throw new AppError("Target is already the owner", 400);
      }

      await prisma.$transaction(async (tx) => {
        await tx.organizationMembers.update({
          where: { id: session.member.id },
          data: { role: "ADMIN" },
        });
        await tx.organizationMembers.update({
          where: { id: memberId },
          data: { role: "OWNER" },
        });
      });

      return NextResponse.json({ success: true });
    }

    requirePermission(session, "manage_members");

    const validation = updateMemberRoleSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(validation.error.errors.map((e) => e.message).join(", "), 400);
    }

    if (target.role === "OWNER") {
      throw new AppError("Cannot change the role of the organization owner", 400);
    }
    if (!canManageRole(session.member.role as Role, target.role as Role)) {
      throw new AppError("You cannot change the role of a member with a higher or equal role", 403);
    }

    const newRole = validation.data.role;
    if (!canManageRole(session.member.role as Role, newRole)) {
      throw new AppError("You cannot assign a role equal to or higher than your own", 403);
    }

    const updated = await prisma.organizationMembers.update({
      where: { id: memberId },
      data: { role: newRole },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
