import {
  BaseIntegration,
  BaseIntegrationConfig,
} from "../_base";
import {
  SyncResult,
  HealthCheckResult,
} from "../../types";

const CONFIG: BaseIntegrationConfig = {
  id: "zapier",
  name: "Zapier",
  version: "1.0.0",
  icon: "zap",
  description: "Connect with thousands of apps via Zapier automations and triggers",
  category: "Automation",
  type: "AUTOMATION",
  permissions: ["write:triggers", "read:zaps", "write:actions"],
  hasOAuth: true,
  hasWebhooks: true,
  oauthProvider: "ZAPIER",
  rateLimit: { requestsPerSecond: 10, maxRetries: 3, baseDelayMs: 500 },
};

interface Zap {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ZapRun {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class ZapierIntegration extends BaseIntegration {
  private apiBase = "https://api.zapier.com/v2";

  constructor() {
    super(CONFIG);
  }

  async healthCheck(
    installedId: string,
    _config: Record<string, unknown>
  ): Promise<HealthCheckResult> {
    try {
      const start = Date.now();
      const credentials = await this.getCredentials(installedId);
      const apiKey = credentials.apiKey;

      if (!apiKey) {
        return { healthy: false, message: "No API key configured" };
      }

      await this.apiRequest(`${this.apiBase}/auth/check`, {
        headers: { "X-API-Key": apiKey },
      });

      return {
        healthy: true,
        latency: Date.now() - start,
        message: "Zapier API is accessible",
      };
    } catch (err) {
      return {
        healthy: false,
        message: err instanceof Error ? err.message : "Health check failed",
      };
    }
  }

  protected async performSync(
    installedId: string,
    _organizationId: string,
    _config: Record<string, unknown>
  ): Promise<SyncResult> {
    const credentials = await this.getCredentials(installedId);
    const apiKey = credentials.apiKey;
    const headers = { "X-API-Key": apiKey };

    const zaps = await this.apiRequest<{ results: Zap[] }>(
      `${this.apiBase}/zaps?limit=100`,
      { headers }
    );

    return {
      success: true,
      recordsProcessed: zaps.results.length,
      metadata: {
        zaps: zaps.results.length,
        zapsList: zaps.results.map((z) => ({ id: z.id, name: z.name, status: z.status })),
      },
    };
  }

  async action_triggerEvent(params: Record<string, unknown>): Promise<unknown> {
    const credentials = await this.getCredentials(String(params.installedId));
    const apiKey = credentials.apiKey;

    const webhookUrl = String(params.webhookUrl ?? "");
    const payload = params.payload ?? {};

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    };

    return this.apiRequest(webhookUrl, {
      method: "POST",
      headers,
      body: payload,
    });
  }

  async action_listZaps(params: Record<string, unknown>): Promise<unknown> {
    const credentials = await this.getCredentials(String(params.installedId));
    const apiKey = credentials.apiKey;

    const data = await this.apiRequest<{ results: Zap[] }>(
      `${this.apiBase}/zaps?limit=${String(params.limit ?? 100)}`,
      { headers: { "X-API-Key": apiKey } }
    );

    return data.results.map((z) => ({
      id: z.id,
      name: z.name,
      status: z.status,
      createdAt: z.createdAt,
      updatedAt: z.updatedAt,
    }));
  }

  async action_checkZapStatus(params: Record<string, unknown>): Promise<unknown> {
    const credentials = await this.getCredentials(String(params.installedId));
    const apiKey = credentials.apiKey;
    const zapId = String(params.zapId ?? "");

    const data = await this.apiRequest<Zap>(
      `${this.apiBase}/zaps/${zapId}`,
      { headers: { "X-API-Key": apiKey } }
    );

    return {
      id: data.id,
      name: data.name,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async action_getRunHistory(params: Record<string, unknown>): Promise<unknown> {
    const credentials = await this.getCredentials(String(params.installedId));
    const apiKey = credentials.apiKey;
    const zapId = String(params.zapId ?? "");

    const data = await this.apiRequest<{ results: ZapRun[] }>(
      `${this.apiBase}/zaps/${zapId}/runs?limit=${String(params.limit ?? 50)}`,
      { headers: { "X-API-Key": apiKey } }
    );

    return data.results.map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }
}

export const zapier = new ZapierIntegration();
