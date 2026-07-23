import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";
import { hasPermission, canManageRole, Permission } from "./permissions";

export class TeamManager {
  static async create(
    organizationId: string,
    userId: string,
    data: { name: string; description?: string; departmentId?: string }
  ): Promise<any> {
    const member = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!member) throw new AppError("Not a member", 403);
    if (!hasPermission(member.role, Permission.TEAM_CREATE)) throw new AppError("Insufficient permissions", 403);

    const existing = await prisma.teams.findUnique({
      where: { organizationId_name: { organizationId, name: data.name } },
    });
    if (existing) throw new AppError("Team name already exists in this organization", 409);

    if (data.departmentId) {
      const dept = await prisma.departments.findUnique({
        where: { id: data.departmentId },
        select: { organizationId: true },
      });
      if (!dept || dept.organizationId !== organizationId) throw new AppError("Department not found", 404);
    }

    const team = await prisma.$transaction(async (tx) => {
      const t = await tx.teams.create({
        data: {
          organizationId,
          name: data.name,
          description: data.description,
          departmentId: data.departmentId,
          createdById: userId,
        },
      });

      await tx.organizationAuditLogs.create({
        data: {
          organizationId,
          actorId: userId,
          action: "team.create",
          entityType: "team",
          entityId: t.id,
          details: { name: data.name },
        },
      });

      return t;
    });

    return team;
  }

  static async getById(teamId: string, organizationId: string): Promise<any> {
    const team = await prisma.teams.findFirst({
      where: { id: teamId, organizationId },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, fullName: true, avatarUrl: true } },
          },
        },
        lead: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        department: { select: { id: true, name: true } },
      },
    });
    return team;
  }

  static async list(organizationId: string, includeDepartment?: string): Promise<any[]> {
    const where: any = { organizationId };
    if (includeDepartment) {
      where.departmentId = includeDepartment === "none" ? null : includeDepartment;
    }
    const teams = await prisma.teams.findMany({
      where,
      include: {
        _count: { select: { members: true } },
        lead: { select: { id: true, fullName: true, email: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });
    return teams;
  }

  static async update(
    teamId: string,
    organizationId: string,
    userId: string,
    data: { name?: string; description?: string; leadId?: string | null; departmentId?: string | null }
  ): Promise<any> {
    const member = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!member) throw new AppError("Not a member", 403);
    if (!hasPermission(member.role, Permission.TEAM_EDIT)) throw new AppError("Insufficient permissions", 403);

    const team = await prisma.teams.findFirst({
      where: { id: teamId, organizationId },
    });
    if (!team) throw new AppError("Team not found", 404);

    if (data.name && data.name !== team.name) {
      const existing = await prisma.teams.findUnique({
        where: { organizationId_name: { organizationId, name: data.name } },
      });
      if (existing) throw new AppError("Team name already exists in this organization", 409);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const t = await tx.teams.update({
        where: { id: teamId },
        data: {
          name: data.name,
          description: data.description,
          leadId: data.leadId !== undefined ? data.leadId : undefined,
          departmentId: data.departmentId !== undefined ? data.departmentId : undefined,
        },
      });

      await tx.organizationAuditLogs.create({
        data: {
          organizationId,
          actorId: userId,
          action: "team.update",
          entityType: "team",
          entityId: teamId,
          details: data,
        },
      });

      return t;
    });

    return updated;
  }

  static async delete(teamId: string, organizationId: string, userId: string): Promise<void> {
    const member = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!member) throw new AppError("Not a member", 403);
    if (!hasPermission(member.role, Permission.TEAM_DELETE)) throw new AppError("Insufficient permissions", 403);

    const team = await prisma.teams.findFirst({
      where: { id: teamId, organizationId },
    });
    if (!team) throw new AppError("Team not found", 404);

    await prisma.$transaction(async (tx) => {
      await tx.teamMembers.deleteMany({ where: { teamId } });
      await tx.teams.delete({ where: { id: teamId } });

      await tx.organizationAuditLogs.create({
        data: {
          organizationId,
          actorId: userId,
          action: "team.delete",
          entityType: "team",
          entityId: teamId,
          details: { name: team.name },
        },
      });
    });
  }

  static async addMember(teamId: string, organizationId: string, actorId: string, targetUserId: string): Promise<void> {
    const actor = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId, userId: actorId } },
    });
    if (!actor) throw new AppError("Not a member", 403);
    if (!hasPermission(actor.role, Permission.TEAM_MANAGE_MEMBERS)) throw new AppError("Insufficient permissions", 403);

    const team = await prisma.teams.findFirst({
      where: { id: teamId, organizationId },
    });
    if (!team) throw new AppError("Team not found", 404);

    const target = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId, userId: targetUserId } },
    });
    if (!target) throw new AppError("Target user is not a member of this organization", 404);

    const existing = await prisma.teamMembers.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });
    if (existing) throw new AppError("User is already a member of this team", 409);

    await prisma.$transaction(async (tx) => {
      await tx.teamMembers.create({
        data: { teamId, userId: targetUserId, organizationId },
      });

      await tx.teams.update({
        where: { id: teamId },
        data: { memberCount: { increment: 1 } },
      });

      await tx.organizationAuditLogs.create({
        data: {
          organizationId,
          actorId,
          action: "team.member.add",
          entityType: "team",
          entityId: teamId,
          details: { userId: targetUserId },
        },
      });
    });
  }

  static async removeMember(teamId: string, organizationId: string, actorId: string, targetUserId: string): Promise<void> {
    const actor = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId, userId: actorId } },
    });
    if (!actor) throw new AppError("Not a member", 403);
    if (!hasPermission(actor.role, Permission.TEAM_MANAGE_MEMBERS)) throw new AppError("Insufficient permissions", 403);

    const membership = await prisma.teamMembers.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });
    if (!membership) throw new AppError("User is not a member of this team", 404);

    await prisma.$transaction(async (tx) => {
      await tx.teamMembers.delete({
        where: { teamId_userId: { teamId, userId: targetUserId } },
      });

      await tx.teams.update({
        where: { id: teamId },
        data: { memberCount: { decrement: 1 } },
      });

      await tx.organizationAuditLogs.create({
        data: {
          organizationId,
          actorId,
          action: "team.member.remove",
          entityType: "team",
          entityId: teamId,
          details: { userId: targetUserId },
        },
      });
    });
  }

  static async getMembers(teamId: string, organizationId: string): Promise<any[]> {
    const members = await prisma.teamMembers.findMany({
      where: { teamId },
      include: {
        user: { select: { id: true, email: true, fullName: true, avatarUrl: true } },
      },
      orderBy: { joinedAt: "asc" },
    });
    return members;
  }
}
