import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";
import { SAMLAssertion, AttributeMapping, ProvisioningResult } from "./types";

const ROLE_HIERARCHY: Record<string, number> = {
  OWNER: 100,
  ADMIN: 80,
  MANAGER: 60,
  EDITOR: 40,
  VIEWER: 10,
};

export class JITProvisioner {
  static async provision(
    organizationId: string,
    assertion: SAMLAssertion,
    attributeMapping: AttributeMapping,
    providerId: string
  ): Promise<ProvisioningResult> {
    const attrs = assertion.attributeStatement || {};
    const mapped = this.applyMapping(attrs, attributeMapping);

    const email = typeof mapped.email === "string" ? mapped.email : assertion.subject.nameId;
    if (!email) {
      throw new AppError("SAML assertion missing email for provisioning", 400);
    }

    const result: ProvisioningResult = {
      userCreated: false,
      userUpdated: false,
      orgAssigned: false,
      roleAssigned: "VIEWER",
      groups: [],
    };

    const rawGroups = mapped.groups;
    if (typeof rawGroups === "string") {
      result.groups = rawGroups.split(/[,;]/).map((g: string) => g.trim()).filter(Boolean);
    } else if (Array.isArray(rawGroups)) {
      result.groups = rawGroups;
    }

    let user = await prisma.users.findUnique({ where: { email } });

    const firstName = typeof mapped.firstName === "string" ? mapped.firstName : undefined;
    const lastName = typeof mapped.lastName === "string" ? mapped.lastName : undefined;
    const fullName = typeof mapped.fullName === "string" ? mapped.fullName : [firstName, lastName].filter(Boolean).join(" ") || undefined;

    if (!user) {
      user = await prisma.users.create({
        data: {
          email,
          name: firstName || fullName,
          fullName,
          plan: "free",
          generationsLimit: 3,
        },
      });
      result.userCreated = true;
    } else {
      const updateData: Record<string, any> = {};
      if (fullName && fullName !== user.fullName) {
        updateData.fullName = fullName;
      }
      if (firstName && firstName !== user.name) {
        updateData.name = firstName;
      }
      if (Object.keys(updateData).length > 0) {
        await prisma.users.update({ where: { id: user.id }, data: updateData });
        result.userUpdated = true;
      }
    }

    const existingMember = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId, userId: user.id } },
    });

    let assignedRole = "VIEWER";
    const rawRole = typeof mapped.role === "string" ? mapped.role : undefined;
    if (rawRole) {
      const normalizedRole = this.normalizeRole(rawRole);
      if (normalizedRole) assignedRole = normalizedRole;
    }

    if (!existingMember) {
      await prisma.organizationMembers.create({
        data: {
          organizationId,
          userId: user.id,
          role: assignedRole as any,
          invitedById: undefined,
        },
      });
      result.orgAssigned = true;
    } else if (existingMember.role !== assignedRole && this.canUpgradeRole(existingMember.role, assignedRole)) {
      await prisma.organizationMembers.update({
        where: { organizationId_userId: { organizationId, userId: user.id } },
        data: { role: assignedRole as any },
      });
    }

    result.roleAssigned = assignedRole;

    await this.syncGroups(organizationId, user.id, result.groups);

    await prisma.ssoLoginEvents.create({
      data: {
        userId: user.id,
        providerId,
        organizationId,
        success: true,
      },
    });

    return result;
  }

  static applyMapping(
    attributes: Record<string, string | string[]>,
    mapping: AttributeMapping
  ): Record<string, string | string[]> {
    const result: Record<string, string | string[]> = {};

    if (mapping.email) {
      result.email = this.resolveAttribute(attributes, mapping.email);
    }
    if (mapping.firstName) {
      result.firstName = this.resolveAttribute(attributes, mapping.firstName);
    }
    if (mapping.lastName) {
      result.lastName = this.resolveAttribute(attributes, mapping.lastName);
    }
    if (mapping.groups) {
      result.groups = this.resolveAttribute(attributes, mapping.groups);
    }
    if (mapping.role) {
      result.role = this.resolveAttribute(attributes, mapping.role);
    }
    if (mapping.department) {
      result.department = this.resolveAttribute(attributes, mapping.department);
    }

    if (result.firstName && result.lastName) {
      result.fullName = `${result.firstName} ${result.lastName}`;
    }

    return result;
  }

  static resolveAttribute(
    attributes: Record<string, string | string[]>,
    mapping: string
  ): string | string[] {
    if (mapping in attributes) {
      return attributes[mapping];
    }

    const parts = mapping.split(".");
    if (parts.length <= 1) {
      return [];
    }

    let current: any = attributes;
    for (const part of parts) {
      if (current == null || typeof current !== "object") return "";
      current = current[part];
    }

    if (current == null) return "";
    return current;
  }

  static normalizeRole(role: string): string | null {
    const upper = role.toUpperCase();

    if (ROLE_HIERARCHY[upper] !== undefined) return upper;

    if (upper.includes("OWNER")) return "OWNER";
    if (upper.includes("ADMIN")) return "ADMIN";
    if (upper.includes("MANAGER") || upper.includes("MANAGE")) return "MANAGER";
    if (upper.includes("EDITOR") || upper.includes("EDIT")) return "EDITOR";
    if (upper.includes("VIEW") || upper.includes("READ")) return "VIEWER";

    return null;
  }

  private static canUpgradeRole(current: string, target: string): boolean {
    const currentLevel = ROLE_HIERARCHY[current] || 0;
    const targetLevel = ROLE_HIERARCHY[target] || 0;
    return targetLevel > currentLevel;
  }

  private static async syncGroups(
    organizationId: string,
    userId: string,
    groups: string[]
  ): Promise<void> {
    if (!groups || groups.length === 0) return;

    if (typeof groups === "string") {
      groups = (groups as string).split(/[,;]/).map((g) => g.trim()).filter(Boolean);
    }
    if (!Array.isArray(groups)) return;

    for (const groupName of groups.slice(0, 20)) {
      let team = await prisma.teams.findFirst({
        where: { organizationId, name: groupName },
      });

      if (!team) {
        team = await prisma.teams.create({
          data: {
            organizationId,
            name: groupName,
            description: `Auto-created from SAML group: ${groupName}`,
            createdById: userId,
          },
        });
      }

      const existing = await prisma.teamMembers.findUnique({
        where: { teamId_userId: { teamId: team.id, userId } },
      });

      if (!existing) {
        await prisma.teamMembers.create({
          data: {
            teamId: team.id,
            userId,
            organizationId,
          },
        });
        await prisma.teams.update({
          where: { id: team.id },
          data: { memberCount: { increment: 1 } },
        });
      }
    }
  }
}
