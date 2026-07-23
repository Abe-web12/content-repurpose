import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { IntegrationCache } from "./cache";
import { IntegrationError, IntegrationNotFoundError } from "./errors";
import { IntegrationType } from "./types";

interface GetIntegrationsOptions {
  type?: string;
  category?: string;
  search?: string;
  isBuiltIn?: boolean;
}

interface UpsertIntegrationData {
  key: string;
  name: string;
  description: string;
  version?: string;
  icon?: string;
  type: IntegrationType;
  category: string;
  provider: string;
  isBuiltIn?: boolean;
  isEnabled?: boolean;
  hasOAuth?: boolean;
  oauthProvider?: string;
  hasWebhooks?: boolean;
  configSchema?: Record<string, unknown>;
  permissions?: string[];
  metadata?: Record<string, unknown>;
  healthEndpoint?: string;
  docsUrl?: string;
}

interface GetInstalledOptions {
  status?: string;
  isPaused?: boolean;
  search?: string;
}

interface UpdateInstalledData {
  status?: string;
  config?: Record<string, unknown>;
  lastSyncAt?: Date;
  lastSyncStatus?: string;
  lastError?: string | null;
  lastHealthCheckAt?: Date;
  healthStatus?: string;
  syncInterval?: number;
  isPaused?: boolean;
  version?: string;
  metadata?: Record<string, unknown>;
}

interface ConnectionStatus {
  status: string;
  health: string | null;
  lastSyncAt: Date | null;
  lastError: string | null;
}

export class IntegrationManager {
  static async getCategories(): Promise<Array<{ key: string; name: string; description: string | null; icon: string; sortOrder: number }>> {
    return IntegrationCache.getOrSet("categories", async () => {
      const categories = await prisma.integrationCategories.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          key: true,
          name: true,
          description: true,
          icon: true,
          sortOrder: true,
        },
      });
      return categories;
    }, 600);
  }

  static async getIntegrations(options?: GetIntegrationsOptions) {
    const cacheKey = `integrations:${JSON.stringify(options ?? {})}`;
    return IntegrationCache.getOrSet(cacheKey, async () => {
      const where: Prisma.IntegrationsWhereInput = {};

      if (options?.type) {
        where.type = options.type as IntegrationType;
      }
      if (options?.category) {
        where.category = options.category;
      }
      if (options?.isBuiltIn !== undefined) {
        where.isBuiltIn = options.isBuiltIn;
      }
      if (options?.search) {
        where.OR = [
          { name: { contains: options.search, mode: "insensitive" } },
          { description: { contains: options.search, mode: "insensitive" } },
        ];
      }

      return prisma.integrations.findMany({
        where,
        orderBy: { name: "asc" },
      });
    }, 300);
  }

  static async getIntegration(key: string) {
    const integration = await IntegrationCache.getOrSet(`integration:${key}`, async () => {
      const result = await prisma.integrations.findUnique({
        where: { key },
      });
      if (!result) {
        throw new IntegrationNotFoundError(key);
      }
      return result;
    }, 300);

    return integration;
  }

  static async upsertIntegration(data: UpsertIntegrationData) {
    const integration = await prisma.integrations.upsert({
      where: { key: data.key },
      create: {
        key: data.key,
        name: data.name,
        description: data.description,
        version: data.version ?? "1.0.0",
        icon: data.icon ?? "puzzle",
        type: data.type,
        category: data.category,
        provider: data.provider,
        isBuiltIn: data.isBuiltIn ?? true,
        isEnabled: data.isEnabled ?? true,
        hasOAuth: data.hasOAuth ?? false,
        oauthProvider: data.oauthProvider as any,
        hasWebhooks: data.hasWebhooks ?? false,
        configSchema: (data.configSchema ?? {}) as any,
        permissions: data.permissions ?? [],
        metadata: (data.metadata ?? null) as any,
        healthEndpoint: data.healthEndpoint,
        docsUrl: data.docsUrl,
      },
      update: {
        name: data.name,
        description: data.description,
        version: data.version,
        icon: data.icon,
        type: data.type,
        category: data.category,
        provider: data.provider,
        isBuiltIn: data.isBuiltIn,
        isEnabled: data.isEnabled,
        hasOAuth: data.hasOAuth,
        oauthProvider: data.oauthProvider as any,
        hasWebhooks: data.hasWebhooks,
        configSchema: (data.configSchema ?? {}) as any,
        permissions: data.permissions,
        metadata: (data.metadata ?? null) as any,
        healthEndpoint: data.healthEndpoint,
        docsUrl: data.docsUrl,
      },
    });

    await IntegrationCache.invalidatePattern(`integration:${data.key}`);
    await IntegrationCache.invalidatePattern("integrations:*");
    await IntegrationCache.invalidatePattern("categories");

    return integration;
  }

  static async getInstalled(organizationId: string, options?: GetInstalledOptions) {
    const cacheKey = `installed:${organizationId}:${JSON.stringify(options ?? {})}`;
    return IntegrationCache.getOrSet(cacheKey, async () => {
      const where: Prisma.InstalledIntegrationsWhereInput = {
        organizationId,
      };

      if (options?.status) {
        where.status = options.status as any;
      }
      if (options?.isPaused !== undefined) {
        where.isPaused = options.isPaused;
      }
      if (options?.search) {
        where.integrationKey = { contains: options.search, mode: "insensitive" };
      }

      return prisma.installedIntegrations.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
    }, 120);
  }

  static async getInstalledIntegration(organizationId: string, integrationKey: string) {
    const installed = await prisma.installedIntegrations.findUnique({
      where: {
        organizationId_integrationKey: {
          organizationId,
          integrationKey,
        },
      },
    });

    if (!installed) {
      throw new IntegrationNotFoundError(`${organizationId}:${integrationKey}`);
    }

    return installed;
  }

  static async getConnectionStatus(organizationId: string, integrationKey: string): Promise<ConnectionStatus> {
    const installed = await this.getInstalledIntegration(organizationId, integrationKey);

    return {
      status: installed.status,
      health: installed.healthStatus,
      lastSyncAt: installed.lastSyncAt,
      lastError: installed.lastError,
    };
  }

  static async updateInstalledStatus(installedId: string, data: UpdateInstalledData) {
    const updated = await prisma.installedIntegrations.update({
      where: { id: installedId },
      data: {
        ...(data.status !== undefined && { status: data.status as any }),
        ...(data.config !== undefined && { config: data.config as any }),
        ...(data.lastSyncAt !== undefined && { lastSyncAt: data.lastSyncAt }),
        ...(data.lastSyncStatus !== undefined && { lastSyncStatus: data.lastSyncStatus }),
        ...(data.lastError !== undefined && { lastError: data.lastError }),
        ...(data.lastHealthCheckAt !== undefined && { lastHealthCheckAt: data.lastHealthCheckAt }),
        ...(data.healthStatus !== undefined && { healthStatus: data.healthStatus }),
        ...(data.syncInterval !== undefined && { syncInterval: data.syncInterval }),
        ...(data.isPaused !== undefined && { isPaused: data.isPaused }),
        ...(data.version !== undefined && { version: data.version }),
        ...(data.metadata !== undefined && { metadata: data.metadata as any }),
      },
    });

    await IntegrationCache.invalidatePattern(`installed:${updated.organizationId}:*`);

    return updated;
  }
}