import { prisma } from "@/lib/prisma";
import {
  IntegrationInterface,
  IntegrationType,
  InstallParams,
  InstallResult,
  SyncResult,
  HealthCheckResult,
} from "../types";
import {
  IntegrationError,
  OAuthError,
  SyncError,
  RateLimitError,
  sanitizeError,
} from "../errors";
import { OAuthManager } from "../oauth";
import { CredentialManager } from "../credentials";
import { IntegrationLogger } from "../logs";
import { IntegrationEventManager } from "../events";
import { IntegrationWebhookManager } from "../webhooks";

export interface RateLimitConfig {
  requestsPerSecond: number;
  maxRetries: number;
  baseDelayMs: number;
}

export interface BaseIntegrationConfig {
  id: string;
  name: string;
  version: string;
  icon: string;
  description: string;
  category: string;
  type: IntegrationType;
  permissions: string[];
  hasOAuth: boolean;
  hasWebhooks: boolean;
  oauthProvider?: string;
  rateLimit?: RateLimitConfig;
  configuration?: Record<string, unknown>;
}

export abstract class BaseIntegration implements IntegrationInterface {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly icon: string;
  readonly description: string;
  readonly category: string;
  readonly type: IntegrationType;
  readonly permissions: string[];
  readonly configuration: Record<string, unknown>;
  readonly hasOAuth: boolean;
  readonly hasWebhooks: boolean;

  private rateLimit: RateLimitConfig;
  private requestTimestamps: number[] = [];

  constructor(config: BaseIntegrationConfig) {
    this.id = config.id;
    this.name = config.name;
    this.version = config.version;
    this.icon = config.icon;
    this.description = config.description;
    this.category = config.category;
    this.type = config.type;
    this.permissions = config.permissions;
    this.hasOAuth = config.hasOAuth;
    this.hasWebhooks = config.hasWebhooks;
    this.configuration = config.configuration ?? {};
    this.rateLimit = config.rateLimit ?? {
      requestsPerSecond: 10,
      maxRetries: 3,
      baseDelayMs: 1000,
    };
  }

  abstract healthCheck(
    installedId: string,
    config: Record<string, unknown>
  ): Promise<HealthCheckResult>;

  async install(params: InstallParams): Promise<InstallResult> {
    const integration = await prisma.integrations.findUnique({
      where: { key: this.id },
    });
    if (!integration) {
      throw new IntegrationError(
        `Integration "${this.id}" not found in database`,
        "INTEGRATION_NOT_REGISTERED",
        500
      );
    }

    const existing = await prisma.installedIntegrations.findUnique({
      where: {
        organizationId_integrationKey: {
          organizationId: params.organizationId,
          integrationKey: this.id,
        },
      },
    });
    if (existing) {
      throw new IntegrationError(
        `Integration "${this.id}" is already installed for this organization`,
        "ALREADY_INSTALLED",
        409
      );
    }

    const installed = await prisma.installedIntegrations.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        integrationKey: this.id,
        status: "PENDING",
        config: (params.config ?? {}) as any,
        version: this.version,
      },
    });

    if (params.credentials) {
      for (const [key, value] of Object.entries(params.credentials)) {
        const { encryptValue } = await import("../installer");
        const encrypted = encryptValue(value);
        await prisma.integrationCredentials.create({
          data: {
            installedId: installed.id,
            organizationId: params.organizationId,
            type: "API_KEY",
            label: key,
            encryptedValue: encrypted,
            keyIdentifier: key,
          },
        });
      }
    }

    try {
      const config = (params.config ?? {}) as Record<string, unknown>;
      const health = await this.healthCheck(installed.id, config);
      if (!health.healthy) {
        await prisma.installedIntegrations.update({
          where: { id: installed.id },
          data: {
            status: "ERROR",
            healthStatus: "unhealthy",
            lastError: health.message ?? "Health check failed",
            lastHealthCheckAt: new Date(),
          },
        });
        await IntegrationLogger.log(
          installed.id,
          params.organizationId,
          "warn",
          `Integration installed but health check failed: ${health.message}`,
          { health },
          this.id
        );
      } else {
        await prisma.installedIntegrations.update({
          where: { id: installed.id },
          data: {
            status: "CONNECTED",
            healthStatus: "healthy",
            lastHealthCheckAt: new Date(),
          },
        });
      }
    } catch (err) {
      await prisma.installedIntegrations.update({
        where: { id: installed.id },
        data: {
          status: "ERROR",
          lastError: err instanceof Error ? err.message : "Health check failed",
        },
      });
      throw err;
    }

    await IntegrationEventManager.emit(
      installed.id,
      params.organizationId,
      "integration.connected",
      { integrationKey: this.id }
    );

    await IntegrationLogger.log(
      installed.id,
      params.organizationId,
      "info",
      `Integration "${this.name}" installed successfully`,
      { status: "CONNECTED" },
      this.id
    );

    return {
      installedId: installed.id,
      status: "CONNECTED",
      config: params.config ?? {},
    };
  }

  async uninstall(installedId: string, config: Record<string, unknown>): Promise<void> {
    const installed = await prisma.installedIntegrations.findUnique({
      where: { id: installedId },
    });
    if (!installed) return;

    const oauthConnection = await prisma.oauthConnections.findFirst({
      where: { installedId, isRevoked: false },
    });
    if (oauthConnection) {
      try {
        await OAuthManager.revokeConnection(oauthConnection.id);
      } catch {
        // continue with cleanup
      }
    }

    await prisma.integrationWebhooks.updateMany({
      where: { installedId, isActive: true },
      data: { isActive: false },
    });

    await prisma.integrationCredentials.updateMany({
      where: { installedId, isActive: true },
      data: { isActive: false },
    });

    await prisma.installedIntegrations.delete({
      where: { id: installedId },
    });

    await IntegrationEventManager.emit(
      installedId,
      installed.organizationId,
      "integration.disconnected",
      { integrationKey: this.id }
    );

    await IntegrationLogger.log(
      installedId,
      installed.organizationId,
      "info",
      `Integration "${this.name}" uninstalled`,
      {},
      this.id
    );
  }

  async sync(installedId: string, config: Record<string, unknown>): Promise<SyncResult> {
    const installed = await prisma.installedIntegrations.findUnique({
      where: { id: installedId },
    });
    if (!installed) {
      throw new IntegrationError(
        `Installation ${installedId} not found`,
        "INSTALLATION_NOT_FOUND",
        404
      );
    }

    await prisma.installedIntegrations.update({
      where: { id: installedId },
      data: {
        lastSyncStatus: "in_progress",
        lastSyncAt: new Date(),
      },
    });

    await IntegrationEventManager.emit(
      installedId,
      installed.organizationId,
      "sync.started",
      { integrationKey: this.id }
    );

    try {
      const result = await this.performSync(installedId, installed.organizationId, config);

      await prisma.installedIntegrations.update({
        where: { id: installedId },
        data: {
          lastSyncStatus: result.success ? "success" : "failed",
          lastSyncAt: new Date(),
          lastError: result.success ? null : (result.errors?.[0] ?? "Sync failed"),
        },
      });

      await IntegrationEventManager.emit(
        installedId,
        installed.organizationId,
        result.success ? "sync.completed" : "sync.failed",
        {
          integrationKey: this.id,
          recordsProcessed: result.recordsProcessed,
          errors: result.errors,
        }
      );

      await IntegrationLogger.log(
        installedId,
        installed.organizationId,
        result.success ? "info" : "error",
        `Sync ${result.success ? "completed" : "failed"} for "${this.name}"`,
        {
          recordsProcessed: result.recordsProcessed,
          recordsCreated: result.recordsCreated,
          recordsUpdated: result.recordsUpdated,
          errors: result.errors,
        },
        this.id
      );

      return result;
    } catch (err) {
      const error = sanitizeError(err);

      await prisma.installedIntegrations.update({
        where: { id: installedId },
        data: {
          lastSyncStatus: "failed",
          lastError: error.message,
        },
      });

      await IntegrationEventManager.emit(
        installedId,
        installed.organizationId,
        "sync.failed",
        {
          integrationKey: this.id,
          error: error.message,
        }
      );

      await IntegrationLogger.log(
        installedId,
        installed.organizationId,
        "error",
        `Sync failed for "${this.name}": ${error.message}`,
        { error: error.message, code: error.code },
        this.id
      );

      throw error;
    }
  }

  protected abstract performSync(
    installedId: string,
    organizationId: string,
    config: Record<string, unknown>
  ): Promise<SyncResult>;

  async execute(action: string, params: Record<string, unknown>): Promise<unknown> {
    const method = `action_${action}` as keyof this;
    if (typeof this[method] === "function") {
      return (this[method] as Function).call(this, params);
    }
    throw new IntegrationError(
      `Action "${action}" not supported by ${this.name}`,
      "UNSUPPORTED_ACTION",
      400
    );
  }

  protected async getValidToken(installedId: string): Promise<string> {
    return OAuthManager.getValidToken(installedId);
  }

  protected async getCredentials(installedId: string): Promise<Record<string, string>> {
    const credentials = await CredentialManager.getCredentials(installedId);
    const result: Record<string, string> = {};
    for (const cred of credentials) {
      result[cred.label] = cred.value;
    }
    return result;
  }

  protected async apiRequest<T>(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: unknown;
      token?: string;
      retries?: number;
    } = {}
  ): Promise<T> {
    const {
      method = "GET",
      headers = {},
      body,
      token,
      retries = this.rateLimit.maxRetries,
    } = options;

    await this.enforceRateLimit();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        const delay = this.rateLimit.baseDelayMs * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }

      try {
        const requestHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          ...headers,
        };

        if (token) {
          requestHeaders["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
        });

        if (response.status === 429) {
          const retryAfter = parseInt(
            response.headers.get("Retry-After") ?? "5",
            10
          );
          throw new RateLimitError(retryAfter);
        }

        if (response.status >= 500 && attempt < retries) {
          lastError = new Error(`Server error: ${response.status}`);
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new IntegrationError(
            `API request failed: ${response.status} ${errorText}`,
            "API_ERROR",
            response.status
          );
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          return response.json() as Promise<T>;
        }
        return (await response.text()) as unknown as T;
      } catch (err) {
        if (err instanceof IntegrationError) throw err;
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw new IntegrationError(
      `API request failed after ${retries + 1} attempts: ${lastError?.message}`,
      "MAX_RETRIES_EXCEEDED",
      500
    );
  }

  protected async dispatchEvent(
    installedId: string,
    organizationId: string,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    try {
      await IntegrationEventManager.emit(
        installedId,
        organizationId,
        eventType,
        payload
      );
    } catch {
      // event emission is non-critical
    }
  }

  protected async dispatchWebhook(
    installedId: string,
    event: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    try {
      await IntegrationWebhookManager.dispatch(installedId, event, payload);
    } catch {
      // webhook dispatch is non-critical
    }
  }

  protected async log(
    installedId: string,
    organizationId: string,
    level: "debug" | "info" | "warn" | "error",
    message: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await IntegrationLogger.log(
      installedId,
      organizationId,
      level,
      message,
      details,
      this.id
    );
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const windowMs = 1000;

    this.requestTimestamps = this.requestTimestamps.filter(
      (t) => now - t < windowMs
    );

    if (this.requestTimestamps.length >= this.rateLimit.requestsPerSecond) {
      const oldest = this.requestTimestamps[0];
      const waitMs = windowMs - (now - oldest) + 10;
      await this.sleep(waitMs);
    }

    this.requestTimestamps.push(Date.now());
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected parseLinkHeader(header: string | null): Record<string, string> {
    const links: Record<string, string> = {};
    if (!header) return links;
    const parts = header.split(",");
    for (const part of parts) {
      const section = part.split(";");
      if (section.length !== 2) continue;
      const url = section[0].replace(/<(.*)>/, "$1").trim();
      const rel = section[1].replace(/rel="(.*)"/, "$1").trim();
      links[rel] = url;
    }
    return links;
  }
}
