import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";
import { randomBytes } from "crypto";
import { hasPermission, canManageRole, Permission } from "./permissions";

const INVITE_EXPIRY_DAYS = 7;

export class InviteManager {
  static async create(orgId: string, actorId: string, email: string, role: string): Promise<{ id: string; token: string }> {
    const actor = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: actorId } },
    });
    if (!actor) throw new AppError("Not a member", 403);
    if (!hasPermission(actor.role, Permission.MEMBER_INVITE)) throw new AppError("Insufficient permissions", 403);
    if (!canManageRole(actor.role, role)) throw new AppError("Cannot invite users with a role equal or higher than your own", 403);

    const org = await prisma.organizations.findUnique({ where: { id: orgId }, select: { maxSeats: true, _count: { select: { members: true } } } });
    if (!org) throw new AppError("Organization not found", 404);
    if (org._count.members >= org.maxSeats) throw new AppError("Organization has reached maximum seat limit", 400);

    const existing = await prisma.organizationInvitations.findFirst({
      where: { organizationId: orgId, email, status: "PENDING" },
    });
    if (existing) throw new AppError("An invitation for this email is already pending", 409);

    const existingMember = await prisma.organizationMembers.findFirst({
      where: { organizationId: orgId, user: { email } },
    });
    if (existingMember) throw new AppError("User is already a member", 409);

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 86400000);

    const invite = await prisma.organizationInvitations.create({
      data: { email, role: role as any, token, organizationId: orgId, invitedById: actorId, expiresAt },
    });

    await prisma.organizationAuditLogs.create({
      data: {
        organizationId: orgId,
        actorId,
        action: "invite.create",
        entityType: "invitation",
        entityId: invite.id,
        details: { email, role },
      },
    });

    return { id: invite.id, token: invite.token };
  }

  static async accept(token: string, userId: string): Promise<{ organizationId: string }> {
    const invite = await prisma.organizationInvitations.findUnique({
      where: { token },
      include: { organization: { select: { name: true } } },
    });

    if (!invite) throw new AppError("Invalid invitation token", 404);
    if (invite.status !== "PENDING") throw new AppError("Invitation is no longer pending", 400);
    if (invite.expiresAt < new Date()) {
      await prisma.organizationInvitations.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
      throw new AppError("Invitation has expired", 400);
    }

    const user = await prisma.users.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user || user.email !== invite.email) throw new AppError("This invitation was sent to a different email address", 403);

    await prisma.$transaction(async (tx) => {
      await tx.organizationMembers.create({
        data: { organizationId: invite.organizationId, userId, role: invite.role },
      });

      await tx.organizationInvitations.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      });

      await tx.organizationAuditLogs.create({
        data: {
          organizationId: invite.organizationId,
          actorId: userId,
          action: "invite.accept",
          entityType: "invitation",
          entityId: invite.id,
        },
      });
    });

    return { organizationId: invite.organizationId };
  }

  static async reject(token: string, userId: string): Promise<void> {
    const invite = await prisma.organizationInvitations.findUnique({
      where: { token },
      include: { organization: { select: { name: true } } },
    });
    if (!invite) throw new AppError("Invalid invitation token", 404);
    if (invite.status !== "PENDING") throw new AppError("Invitation is no longer pending", 400);

    await prisma.organizationInvitations.update({
      where: { id: invite.id },
      data: { status: "REJECTED", rejectedAt: new Date() },
    });
  }

  static async revoke(orgId: string, actorId: string, inviteId: string): Promise<void> {
    const actor = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: actorId } },
    });
    if (!actor) throw new AppError("Not a member", 403);
    if (!hasPermission(actor.role, Permission.MEMBER_INVITE)) throw new AppError("Insufficient permissions", 403);

    const invite = await prisma.organizationInvitations.findUnique({ where: { id: inviteId } });
    if (!invite || invite.organizationId !== orgId) throw new AppError("Invitation not found", 404);

    await prisma.organizationInvitations.update({
      where: { id: inviteId },
      data: { status: "EXPIRED" },
    });
  }

  static async resend(orgId: string, actorId: string, inviteId: string): Promise<{ token: string }> {
    const actor = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: actorId } },
    });
    if (!actor) throw new AppError("Not a member", 403);
    if (!hasPermission(actor.role, Permission.MEMBER_INVITE)) throw new AppError("Insufficient permissions", 403);

    const invite = await prisma.organizationInvitations.findUnique({ where: { id: inviteId } });
    if (!invite || invite.organizationId !== orgId) throw new AppError("Invitation not found", 404);

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 86400000);

    await prisma.organizationInvitations.update({
      where: { id: inviteId },
      data: { token, expiresAt, status: "PENDING" },
    });

    return { token };
  }

  static async getPending(orgId: string): Promise<any[]> {
    return prisma.organizationInvitations.findMany({
      where: { organizationId: orgId, status: "PENDING" },
      include: { invitedBy: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getForUser(email: string): Promise<any[]> {
    return prisma.organizationInvitations.findMany({
      where: { email, status: "PENDING", expiresAt: { gte: new Date() } },
      include: { organization: { select: { id: true, name: true, slug: true, logo: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
}
