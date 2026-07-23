import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";
import { randomBytes } from "crypto";
import { hasPermission, canManageRole, Permission } from "./permissions";

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + randomBytes(3).toString("hex");
}

export class OrganizationManager {
  static async create(name: string, userId: string, slug?: string): Promise<{ id: string; slug: string }> {
    const orgSlug = slug || generateSlug(name);

    const existing = await prisma.organizations.findUnique({ where: { slug: orgSlug } });
    if (existing) throw new AppError("Organization slug already exists", 409);

    const org = await prisma.$transaction(async (tx) => {
      const o = await tx.organizations.create({
        data: { name, slug: orgSlug },
      });

      await tx.organizationMembers.create({
        data: { organizationId: o.id, userId, role: "OWNER" },
      });

      await tx.organizationAuditLogs.create({
        data: {
          organizationId: o.id,
          actorId: userId,
          action: "org.create",
          entityType: "organization",
          entityId: o.id,
          details: { name },
        },
      });

      return o;
    });

    return { id: org.id, slug: org.slug };
  }

  static async getById(orgId: string): Promise<any> {
    const org = await prisma.organizations.findUnique({
      where: { id: orgId },
      include: {
        _count: { select: { members: true, invitations: { where: { status: "PENDING" } } } },
      },
    });
    return org;
  }

  static async update(orgId: string, userId: string, data: { name?: string; logo?: string; timezone?: string; brandColor?: string; domain?: string; maxSeats?: number }): Promise<any> {
    const member = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!member) throw new AppError("Not a member", 403);
    if (!hasPermission(member.role, Permission.ORG_EDIT)) throw new AppError("Insufficient permissions", 403);

    const org = await prisma.organizations.update({ where: { id: orgId }, data });

    await prisma.organizationAuditLogs.create({
      data: {
        organizationId: orgId,
        actorId: userId,
        action: "org.update",
        entityType: "organization",
        entityId: orgId,
        details: data,
      },
    });

    return org;
  }

  static async getMembers(orgId: string): Promise<any[]> {
    const members = await prisma.organizationMembers.findMany({
      where: { organizationId: orgId, isSuspended: false },
      include: {
        user: { select: { id: true, email: true, fullName: true, avatarUrl: true, plan: true } },
        invitedBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    return members;
  }

  static async getMember(orgId: string, userId: string): Promise<any> {
    const member = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      include: {
        user: { select: { id: true, email: true, fullName: true, avatarUrl: true } },
      },
    });
    return member;
  }

  static async removeMember(orgId: string, actorId: string, targetUserId: string): Promise<void> {
    const actor = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: actorId } },
    });
    if (!actor) throw new AppError("Not a member", 403);
    if (!hasPermission(actor.role, Permission.MEMBER_REMOVE)) throw new AppError("Insufficient permissions", 403);

    const target = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    });
    if (!target) throw new AppError("Member not found", 404);
    if (!canManageRole(actor.role, target.role)) throw new AppError("Cannot remove users with equal or higher role", 403);

    await prisma.$transaction(async (tx) => {
      await tx.organizationMembers.delete({
        where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
      });

      await tx.organizationAuditLogs.create({
        data: {
          organizationId: orgId,
          actorId,
          action: "member.remove",
          entityType: "member",
          entityId: targetUserId,
          details: { role: target.role },
        },
      });
    });
  }

  static async suspendMember(orgId: string, actorId: string, targetUserId: string, suspended: boolean): Promise<void> {
    const actor = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: actorId } },
    });
    if (!actor) throw new AppError("Not a member", 403);
    if (!hasPermission(actor.role, Permission.MEMBER_SUSPEND)) throw new AppError("Insufficient permissions", 403);

    const target = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    });
    if (!target) throw new AppError("Member not found", 404);
    if (!canManageRole(actor.role, target.role)) throw new AppError("Cannot suspend users with equal or higher role", 403);

    await prisma.organizationMembers.update({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
      data: { isSuspended: suspended },
    });

    await prisma.organizationAuditLogs.create({
      data: {
        organizationId: orgId,
        actorId,
        action: suspended ? "member.suspend" : "member.unsuspend",
        entityType: "member",
        entityId: targetUserId,
      },
    });
  }

  static async changeMemberRole(orgId: string, actorId: string, targetUserId: string, newRole: string): Promise<void> {
    const actor = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: actorId } },
    });
    if (!actor) throw new AppError("Not a member", 403);
    if (!hasPermission(actor.role, Permission.MEMBER_ROLE)) throw new AppError("Insufficient permissions", 403);

    const target = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    });
    if (!target) throw new AppError("Member not found", 404);
    if (!canManageRole(actor.role, target.role)) throw new AppError("Cannot change roles of users with equal or higher role", 403);
    if (!canManageRole(actor.role, newRole)) throw new AppError("Cannot assign roles equal or higher than your own", 403);

    await prisma.organizationMembers.update({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
      data: { role: newRole as any },
    });

    await prisma.organizationAuditLogs.create({
      data: {
        organizationId: orgId,
        actorId,
        action: "member.role_change",
        entityType: "member",
        entityId: targetUserId,
        details: { from: target.role, to: newRole },
      },
    });
  }

  static async transferOwnership(orgId: string, actorId: string, newOwnerId: string): Promise<void> {
    const actor = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: actorId } },
    });
    if (!actor || actor.role !== "OWNER") throw new AppError("Only the owner can transfer ownership", 403);

    const newOwner = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: newOwnerId } },
    });
    if (!newOwner) throw new AppError("Target user is not a member", 404);

    await prisma.$transaction(async (tx) => {
      await tx.organizationMembers.update({
        where: { organizationId_userId: { organizationId: orgId, userId: actorId } },
        data: { role: "ADMIN" },
      });
      await tx.organizationMembers.update({
        where: { organizationId_userId: { organizationId: orgId, userId: newOwnerId } },
        data: { role: "OWNER" },
      });
      await tx.organizationAuditLogs.create({
        data: {
          organizationId: orgId,
          actorId,
          action: "org.transfer_ownership",
          entityType: "organization",
          entityId: orgId,
          details: { from: actorId, to: newOwnerId },
        },
      });
    });
  }

  static async getUserOrganizations(userId: string): Promise<any[]> {
    const memberships = await prisma.organizationMembers.findMany({
      where: { userId, isSuspended: false },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, logo: true, plan: true, maxSeats: true },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    return memberships.map((m) => ({ ...m.organization, role: m.role }));
  }

  static async getAuditLogs(orgId: string, limit = 50, offset = 0): Promise<any[]> {
    return prisma.organizationAuditLogs.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  static async getUserRole(orgId: string, userId: string): Promise<string | null> {
    const member = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      select: { role: true, isSuspended: true },
    });
    if (!member || member.isSuspended) return null;
    return member.role;
  }
}
