import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";
import { hasPermission, Permission } from "./permissions";

export class DepartmentManager {
  static async create(
    organizationId: string,
    userId: string,
    data: { name: string; description?: string }
  ): Promise<any> {
    const member = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!member) throw new AppError("Not a member", 403);
    if (!hasPermission(member.role, Permission.DEPARTMENT_CREATE)) throw new AppError("Insufficient permissions", 403);

    const existing = await prisma.departments.findUnique({
      where: { organizationId_name: { organizationId, name: data.name } },
    });
    if (existing) throw new AppError("Department name already exists in this organization", 409);

    const department = await prisma.$transaction(async (tx) => {
      const d = await tx.departments.create({
        data: {
          organizationId,
          name: data.name,
          description: data.description,
          createdById: userId,
        },
      });

      await tx.organizationAuditLogs.create({
        data: {
          organizationId,
          actorId: userId,
          action: "department.create",
          entityType: "department",
          entityId: d.id,
          details: { name: data.name },
        },
      });

      return d;
    });

    return department;
  }

  static async getById(departmentId: string, organizationId: string): Promise<any> {
    const department = await prisma.departments.findFirst({
      where: { id: departmentId, organizationId },
      include: {
        teams: {
          include: {
            _count: { select: { members: true } },
            lead: { select: { id: true, fullName: true, email: true } },
          },
        },
        head: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
      },
    });
    return department;
  }

  static async list(organizationId: string): Promise<any[]> {
    const departments = await prisma.departments.findMany({
      where: { organizationId },
      include: {
        _count: { select: { teams: true } },
        head: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { name: "asc" },
    });
    return departments;
  }

  static async update(
    departmentId: string,
    organizationId: string,
    userId: string,
    data: { name?: string; description?: string; headId?: string | null }
  ): Promise<any> {
    const member = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!member) throw new AppError("Not a member", 403);
    if (!hasPermission(member.role, Permission.DEPARTMENT_EDIT)) throw new AppError("Insufficient permissions", 403);

    const department = await prisma.departments.findFirst({
      where: { id: departmentId, organizationId },
    });
    if (!department) throw new AppError("Department not found", 404);

    if (data.name && data.name !== department.name) {
      const existing = await prisma.departments.findUnique({
        where: { organizationId_name: { organizationId, name: data.name } },
      });
      if (existing) throw new AppError("Department name already exists in this organization", 409);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const d = await tx.departments.update({
        where: { id: departmentId },
        data: {
          name: data.name,
          description: data.description,
          headId: data.headId !== undefined ? data.headId : undefined,
        },
      });

      await tx.organizationAuditLogs.create({
        data: {
          organizationId,
          actorId: userId,
          action: "department.update",
          entityType: "department",
          entityId: departmentId,
          details: data,
        },
      });

      return d;
    });

    return updated;
  }

  static async delete(departmentId: string, organizationId: string, userId: string): Promise<void> {
    const member = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!member) throw new AppError("Not a member", 403);
    if (!hasPermission(member.role, Permission.DEPARTMENT_DELETE)) throw new AppError("Insufficient permissions", 403);

    const department = await prisma.departments.findFirst({
      where: { id: departmentId, organizationId },
    });
    if (!department) throw new AppError("Department not found", 404);

    await prisma.$transaction(async (tx) => {
      await tx.teams.updateMany({
        where: { departmentId },
        data: { departmentId: null },
      });

      await tx.departments.delete({ where: { id: departmentId } });

      await tx.organizationAuditLogs.create({
        data: {
          organizationId,
          actorId: userId,
          action: "department.delete",
          entityType: "department",
          entityId: departmentId,
          details: { name: department.name },
        },
      });
    });
  }

  static async assignTeam(departmentId: string, organizationId: string, userId: string, teamId: string): Promise<void> {
    const member = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!member) throw new AppError("Not a member", 403);
    if (!hasPermission(member.role, Permission.DEPARTMENT_MANAGE_TEAMS)) throw new AppError("Insufficient permissions", 403);

    const department = await prisma.departments.findFirst({
      where: { id: departmentId, organizationId },
    });
    if (!department) throw new AppError("Department not found", 404);

    const team = await prisma.teams.findFirst({
      where: { id: teamId, organizationId },
    });
    if (!team) throw new AppError("Team not found", 404);

    await prisma.$transaction(async (tx) => {
      await tx.teams.update({
        where: { id: teamId },
        data: { departmentId },
      });

      const teamCount = await tx.teams.count({ where: { departmentId } });

      await tx.departments.update({
        where: { id: departmentId },
        data: { teamCount },
      });

      await tx.organizationAuditLogs.create({
        data: {
          organizationId,
          actorId: userId,
          action: "department.assign_team",
          entityType: "department",
          entityId: departmentId,
          details: { teamId },
        },
      });
    });
  }

  static async unassignTeam(departmentId: string, organizationId: string, userId: string, teamId: string): Promise<void> {
    const member = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!member) throw new AppError("Not a member", 403);
    if (!hasPermission(member.role, Permission.DEPARTMENT_MANAGE_TEAMS)) throw new AppError("Insufficient permissions", 403);

    const team = await prisma.teams.findFirst({
      where: { id: teamId, organizationId, departmentId },
    });
    if (!team) throw new AppError("Team not found in this department", 404);

    await prisma.$transaction(async (tx) => {
      await tx.teams.update({
        where: { id: teamId },
        data: { departmentId: null },
      });

      const teamCount = await tx.teams.count({ where: { departmentId } });
      await tx.departments.update({
        where: { id: departmentId },
        data: { teamCount },
      });

      await tx.organizationAuditLogs.create({
        data: {
          organizationId,
          actorId: userId,
          action: "department.unassign_team",
          entityType: "department",
          entityId: departmentId,
          details: { teamId },
        },
      });
    });
  }
}
