import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";

export interface CreateTeamInput {
  organizationId: string;
  name: string;
  description?: string;
  leadId?: string;
  createdById: string;
}

export interface UpdateTeamInput {
  name?: string;
  description?: string;
  leadId?: string | null;
}

export interface CreateDepartmentInput {
  organizationId: string;
  name: string;
  description?: string;
  headId?: string;
  createdById: string;
}

export interface UpdateDepartmentInput {
  name?: string;
  description?: string;
  headId?: string | null;
}

export interface AddTeamMemberInput {
  teamId: string;
  userId: string;
  role?: string;
  organizationId: string;
}

export class TeamManager {
  // ─── Teams ───────────────────────────────────────────────────────────────

  static async create(data: CreateTeamInput) {
    const existing = await prisma.teams.findFirst({
      where: { organizationId: data.organizationId, name: data.name },
    });
    if (existing) throw new AppError("A team with this name already exists", 409);

    return prisma.teams.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        description: data.description ?? null,
        leadId: data.leadId ?? null,
        createdById: data.createdById,
      },
    });
  }

  static async update(id: string, organizationId: string, data: UpdateTeamInput) {
    const team = await prisma.teams.findFirst({
      where: { id, organizationId },
    });
    if (!team) throw new AppError("Team not found", 404);

    if (data.name && data.name !== team.name) {
      const duplicate = await prisma.teams.findFirst({
        where: { organizationId, name: data.name, id: { not: id } },
      });
      if (duplicate) throw new AppError("A team with this name already exists", 409);
    }

    return prisma.teams.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.leadId !== undefined && { leadId: data.leadId }),
      },
    });
  }

  static async delete(id: string, organizationId: string) {
    const team = await prisma.teams.findFirst({
      where: { id, organizationId },
    });
    if (!team) throw new AppError("Team not found", 404);

    await prisma.teamMembers.deleteMany({ where: { teamId: id } });
    await prisma.teams.delete({ where: { id } });
  }

  static async list(organizationId: string) {
    return prisma.teams.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
  }

  static async get(id: string, organizationId: string) {
    const team = await prisma.teams.findFirst({
      where: { id, organizationId },
    });
    if (!team) throw new AppError("Team not found", 404);
    return team;
  }

  // ─── Team Members ────────────────────────────────────────────────────────

  static async addMember(data: AddTeamMemberInput) {
    const team = await prisma.teams.findFirst({
      where: { id: data.teamId, organizationId: data.organizationId },
    });
    if (!team) throw new AppError("Team not found", 404);

    const existing = await prisma.teamMembers.findUnique({
      where: { teamId_userId: { teamId: data.teamId, userId: data.userId } },
    });
    if (existing) throw new AppError("User is already a member of this team", 409);

    const [member] = await Promise.all([
      prisma.teamMembers.create({
        data: {
          teamId: data.teamId,
          userId: data.userId,
          role: data.role ?? "member",
          organizationId: data.organizationId,
        },
      }),
      prisma.teams.update({
        where: { id: data.teamId },
        data: { memberCount: { increment: 1 } },
      }),
    ]);

    return member;
  }

  static async removeMember(teamId: string, userId: string, organizationId: string) {
    const team = await prisma.teams.findFirst({
      where: { id: teamId, organizationId },
    });
    if (!team) throw new AppError("Team not found", 404);

    await Promise.all([
      prisma.teamMembers.delete({
        where: { teamId_userId: { teamId, userId } },
      }),
      prisma.teams.update({
        where: { id: teamId },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);
  }

  static async listMembers(teamId: string, organizationId: string) {
    const team = await prisma.teams.findFirst({
      where: { id: teamId, organizationId },
    });
    if (!team) throw new AppError("Team not found", 404);

    return prisma.teamMembers.findMany({
      where: { teamId },
      orderBy: { joinedAt: "desc" },
    });
  }

  static async updateMemberRole(teamId: string, userId: string, role: string, organizationId: string) {
    const team = await prisma.teams.findFirst({
      where: { id: teamId, organizationId },
    });
    if (!team) throw new AppError("Team not found", 404);

    return prisma.teamMembers.update({
      where: { teamId_userId: { teamId, userId } },
      data: { role },
    });
  }

  // ─── Departments ─────────────────────────────────────────────────────────

  static async createDepartment(data: CreateDepartmentInput) {
    const existing = await prisma.departments.findFirst({
      where: { organizationId: data.organizationId, name: data.name },
    });
    if (existing) throw new AppError("A department with this name already exists", 409);

    return prisma.departments.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        description: data.description ?? null,
        headId: data.headId ?? null,
        createdById: data.createdById,
      },
    });
  }

  static async updateDepartment(id: string, organizationId: string, data: UpdateDepartmentInput) {
    const dept = await prisma.departments.findFirst({
      where: { id, organizationId },
    });
    if (!dept) throw new AppError("Department not found", 404);

    return prisma.departments.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.headId !== undefined && { headId: data.headId }),
      },
    });
  }

  static async deleteDepartment(id: string, organizationId: string) {
    const dept = await prisma.departments.findFirst({
      where: { id, organizationId },
    });
    if (!dept) throw new AppError("Department not found", 404);

    await prisma.departments.delete({ where: { id } });
  }

  static async listDepartments(organizationId: string) {
    return prisma.departments.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
  }

  static async getDepartment(id: string, organizationId: string) {
    const dept = await prisma.departments.findFirst({
      where: { id, organizationId },
    });
    if (!dept) throw new AppError("Department not found", 404);
    return dept;
  }
}
