import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";

interface SCIMUser {
  schemas: string[];
  id?: string;
  externalId: string;
  userName: string;
  name?: {
    formatted?: string;
    givenName?: string;
    familyName?: string;
  };
  emails?: Array<{
    value: string;
    primary?: boolean;
    type?: string;
  }>;
  active?: boolean;
  groups?: string[];
}

interface SCIMGroup {
  schemas: string[];
  id?: string;
  externalId: string;
  displayName: string;
  members?: Array<{
    value: string;
    display?: string;
    type?: string;
  }>;
}

interface SCIMListResponse {
  schemas: string[];
  totalResults: number;
  itemsPerPage: number;
  startIndex: number;
  Resources: unknown[];
}

interface SCIMError {
  schemas: string[];
  detail: string;
  status: number;
}

export class SCIMProvisioner {
  static async getProvider(providerId: string) {
    return prisma.scimProviders.findUnique({
      where: { id: providerId },
    });
  }

  static async getOrgProvider(orgId: string, providerType: string) {
    return prisma.scimProviders.findUnique({
      where: {
        organizationId_providerType: {
          organizationId: orgId,
          providerType: providerType as any,
        },
      },
    });
  }

  static async createProvider(data: {
    organizationId: string;
    providerType: string;
    baseUrl: string;
    apiToken: string;
  }) {
    const existing = await prisma.scimProviders.findFirst({
      where: { organizationId: data.organizationId },
    });
    if (existing) throw new AppError("A SCIM provider is already configured for this organization", 409);

    const response = await fetch(`${data.baseUrl}/ServiceProviderConfigs`, {
      headers: { Authorization: `Bearer ${data.apiToken}` },
    });

    if (!response.ok) {
      throw new AppError("Unable to connect to SCIM provider - check the base URL and API token", 400);
    }

    return prisma.scimProviders.create({
      data: {
        organizationId: data.organizationId,
        providerType: data.providerType as any,
        baseUrl: data.baseUrl,
        apiToken: data.apiToken,
        enabled: true,
      },
    });
  }

  static async updateProvider(providerId: string, data: Partial<{ baseUrl: string; apiToken: string; enabled: boolean }>) {
    return prisma.scimProviders.update({
      where: { id: providerId },
      data,
    });
  }

  static async deleteProvider(providerId: string): Promise<void> {
    const groups = await prisma.scimGroups.findMany({ where: { providerId }, select: { id: true } });
    const groupIds = groups.map((g) => g.id);
    if (groupIds.length > 0) {
      await prisma.scimGroupMembers.deleteMany({ where: { groupId: { in: groupIds } } });
    }
    await prisma.scimGroups.deleteMany({ where: { providerId } });
    await prisma.scimUsers.deleteMany({ where: { providerId } });
    await prisma.scimProviders.delete({ where: { id: providerId } });
  }

  static async pushUser(
    providerId: string,
    user: SCIMUser
  ): Promise<{ externalId: string; id: string }> {
    const provider = await this.getProvider(providerId);
    if (!provider) throw new AppError("SCIM provider not found", 404);

    const existing = await prisma.scimUsers.findUnique({
      where: { providerId_externalId: { providerId, externalId: user.externalId } },
    });

    if (existing) {
      const response = await fetch(`${provider.baseUrl}/Users/${existing.externalId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${provider.apiToken}`,
          "Content-Type": "application/scim+json",
        },
        body: JSON.stringify(user),
      });

      if (!response.ok) {
        throw new AppError(`SCIM update user failed: ${response.status}`, 500);
      }

      const result = await response.json();

      await prisma.scimUsers.update({
        where: { id: existing.id },
        data: {
          userName: user.userName,
          nameFormatted: user.name?.formatted,
          givenName: user.name?.givenName,
          familyName: user.name?.familyName,
          email: user.emails?.[0]?.value,
          active: user.active ?? true,
          metadata: result as any,
        },
      });

      return { externalId: existing.externalId, id: existing.id };
    }

    const response = await fetch(`${provider.baseUrl}/Users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiToken}`,
        "Content-Type": "application/scim+json",
      },
      body: JSON.stringify(user),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "");
      throw new AppError(`SCIM create user failed: ${response.status} ${error}`, 500);
    }

    const result = await response.json();
    const createdId = result.id ?? user.externalId;

    const record = await prisma.scimUsers.create({
      data: {
        providerId,
        externalId: createdId,
        userName: user.userName,
        nameFormatted: user.name?.formatted,
        givenName: user.name?.givenName,
        familyName: user.name?.familyName,
        email: user.emails?.[0]?.value,
        active: user.active ?? true,
        metadata: result as any,
      },
    });

    return { externalId: createdId, id: record.id };
  }

  static async pushGroup(
    providerId: string,
    group: SCIMGroup
  ): Promise<{ externalId: string; id: string }> {
    const provider = await this.getProvider(providerId);
    if (!provider) throw new AppError("SCIM provider not found", 404);

    const existing = await prisma.scimGroups.findUnique({
      where: { providerId_externalId: { providerId, externalId: group.externalId } },
    });

    if (existing) {
      const response = await fetch(`${provider.baseUrl}/Groups/${existing.externalId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${provider.apiToken}`,
          "Content-Type": "application/scim+json",
        },
        body: JSON.stringify(group),
      });

      if (!response.ok) {
        throw new AppError(`SCIM update group failed: ${response.status}`, 500);
      }

      const result = await response.json();

      await prisma.scimGroups.update({
        where: { id: existing.id },
        data: {
          name: group.displayName,
          metadata: result as any,
        },
      });

      return { externalId: existing.externalId, id: existing.id };
    }

    const response = await fetch(`${provider.baseUrl}/Groups`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiToken}`,
        "Content-Type": "application/scim+json",
      },
      body: JSON.stringify(group),
    });

    if (!response.ok) {
      throw new AppError(`SCIM create group failed: ${response.status}`, 500);
    }

    const result = await response.json();
    const createdId = result.id ?? group.externalId;

    const record = await prisma.scimGroups.create({
      data: {
        providerId,
        externalId: createdId,
        name: group.displayName,
        metadata: result as any,
      },
    });

    return { externalId: createdId, id: record.id };
  }

  static async deactivateUser(providerId: string, externalId: string): Promise<void> {
    const provider = await this.getProvider(providerId);
    if (!provider) throw new AppError("SCIM provider not found", 404);

    const scimUser = {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      active: false,
    };

    const response = await fetch(`${provider.baseUrl}/Users/${externalId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${provider.apiToken}`,
        "Content-Type": "application/scim+json",
      },
      body: JSON.stringify(scimUser),
    });

    if (!response.ok) {
      throw new AppError(`SCIM deactivate user failed: ${response.status}`, 500);
    }

    await prisma.scimUsers.update({
      where: { providerId_externalId: { providerId, externalId } },
      data: { active: false },
    });
  }

  static async syncFromProvider(providerId: string): Promise<{
    usersSynced: number;
    groupsSynced: number;
  }> {
    const provider = await this.getProvider(providerId);
    if (!provider) throw new AppError("SCIM provider not found", 404);

    let usersSynced = 0;
    let groupsSynced = 0;

    try {
      const usersResponse = await fetch(`${provider.baseUrl}/Users?count=100`, {
        headers: { Authorization: `Bearer ${provider.apiToken}` },
      });

      if (usersResponse.ok) {
        const usersData: { Resources: SCIMUser[]; totalResults: number } = await usersResponse.json();

        for (const scimUser of usersData.Resources ?? []) {
          await prisma.scimUsers.upsert({
            where: {
              providerId_externalId: {
                providerId,
                externalId: scimUser.id ?? scimUser.externalId,
              },
            },
            create: {
              providerId,
              externalId: scimUser.id ?? scimUser.externalId,
              userName: scimUser.userName,
              nameFormatted: scimUser.name?.formatted,
              givenName: scimUser.name?.givenName,
              familyName: scimUser.name?.familyName,
              email: scimUser.emails?.[0]?.value,
              active: scimUser.active ?? true,
              metadata: scimUser as any,
            },
            update: {
              userName: scimUser.userName,
              nameFormatted: scimUser.name?.formatted,
              givenName: scimUser.name?.givenName,
              familyName: scimUser.name?.familyName,
              email: scimUser.emails?.[0]?.value,
              active: scimUser.active ?? true,
              metadata: scimUser as any,
            },
          });
          usersSynced++;
        }
      }

      const groupsResponse = await fetch(`${provider.baseUrl}/Groups?count=100`, {
        headers: { Authorization: `Bearer ${provider.apiToken}` },
      });

      if (groupsResponse.ok) {
        const groupsData: { Resources: SCIMGroup[]; totalResults: number } = await groupsResponse.json();

        for (const scimGroup of groupsData.Resources ?? []) {
          const group = await prisma.scimGroups.upsert({
            where: {
              providerId_externalId: {
                providerId,
                externalId: scimGroup.id ?? scimGroup.externalId,
              },
            },
            create: {
              providerId,
              externalId: scimGroup.id ?? scimGroup.externalId,
              name: scimGroup.displayName,
              metadata: scimGroup as any,
            },
            update: {
              name: scimGroup.displayName,
              metadata: scimGroup as any,
            },
          });

          if (scimGroup.members) {
            for (const member of scimGroup.members) {
              const scimUser = await prisma.scimUsers.findUnique({
                where: { providerId_externalId: { providerId, externalId: member.value } },
              });

              if (scimUser) {
                await prisma.scimGroupMembers.upsert({
                  where: {
                    groupId_userId: { groupId: group.id, userId: scimUser.id },
                  },
                  create: {
                    groupId: group.id,
                    userId: scimUser.id,
                    memberType: member.type ?? "User",
                  },
                  update: {},
                });
              }
            }
          }

          groupsSynced++;
        }
      }

      await prisma.scimProviders.update({
        where: { id: providerId },
        data: { lastSyncedAt: new Date() },
      });
    } catch (err) {
      throw new AppError(
        `SCIM sync failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        500
      );
    }

    return { usersSynced, groupsSynced };
  }

  static async getUsers(
    providerId: string,
    options?: { active?: boolean; search?: string; limit?: number; offset?: number }
  ) {
    const where: Record<string, unknown> = { providerId };
    if (options?.active !== undefined) where.active = options.active;
    if (options?.search) {
      where.OR = [
        { userName: { contains: options.search, mode: "insensitive" } },
        { email: { contains: options.search, mode: "insensitive" } },
        { nameFormatted: { contains: options.search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.scimUsers.findMany({
        where: where as any,
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
        orderBy: { userName: "asc" },
      }),
      prisma.scimUsers.count({ where: where as any }),
    ]);

    return { users, total };
  }

  static async getGroups(
    providerId: string,
    options?: { search?: string; limit?: number; offset?: number }
  ) {
    const where: Record<string, unknown> = { providerId };
    if (options?.search) {
      where.name = { contains: options.search, mode: "insensitive" };
    }

    const [groups, total] = await Promise.all([
      prisma.scimGroups.findMany({
        where: where as any,
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
        orderBy: { name: "asc" },
      }),
      prisma.scimGroups.count({ where: where as any }),
    ]);

    return { groups, total };
  }

  static async getGroupMembers(groupId: string) {
    const members = await prisma.scimGroupMembers.findMany({
      where: { groupId },
    });

    if (members.length === 0) return [];

    const userIds = members.map((m) => m.userId);
    const users = await prisma.scimUsers.findMany({
      where: { id: { in: userIds } },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return members.map((m) => {
      const user = userMap.get(m.userId);
      return {
        id: user?.id ?? m.userId,
        externalId: user?.externalId ?? "",
        userName: user?.userName ?? "",
        email: user?.email ?? "",
        name: user?.nameFormatted ?? null,
        active: user?.active ?? false,
      };
    });
  }
}
