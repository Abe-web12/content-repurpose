import { randomBytes, createHmac } from "crypto";
import {
  BaseIntegration,
  BaseIntegrationConfig,
} from "../_base";
import {
  SyncResult,
  HealthCheckResult,
} from "../../types";

const CONFIG: BaseIntegrationConfig = {
  id: "webhook",
  name: "Webhook",
  version: "1.0.0",
  icon: "webhook",
  description: "Send data to any HTTP endpoint with customizable payloads and signing",
  category: "Automation",
  type: "AUTOMATION",
  permissions: ["write:webhooks", "read:responses"],
  hasOAuth: false,
  hasWebhooks: false,
  rateLimit: { requestsPerSecond: 20, maxRetries: 3, baseDelayMs: 500 },
};

interface WebhookCallResult {
  success: boolean;
  statusCode: number | null;
  body: string | null;
  duration: number;
  error: string | null;
}

interface WebhookConfig {
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  secret?: string;
  retryCount?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

export class WebhookIntegration extends BaseIntegration {
  constructor() {
    super(CONFIG);
  }

  async healthCheck(
    _installedId: string,
    config: Record<string, unknown>
  ): Promise<HealthCheckResult> {
    const webhookConfig = config as Record<string, unknown>;
    if (!webhookConfig.url) {
      return {
        healthy: false,
        message: "No webhook URL configured",
      };
    }

    try {
      const url = String(webhookConfig.url);
      const start = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      return {
        healthy: response.ok || response.status < 500,
        latency: Date.now() - start,
        message: `Webhook endpoint responded with ${response.status}`,
        details: { statusCode: response.status },
      };
    } catch {
      return {
        healthy: false,
        message: "Webhook endpoint is not reachable",
      };
    }
  }

  protected async performSync(
    _installedId: string,
    _organizationId: string,
    _config: Record<string, unknown>
  ): Promise<SyncResult> {
    return {
      success: true,
      recordsProcessed: 0,
    };
  }

  async action_send(params: Record<string, unknown>): Promise<WebhookCallResult> {
    const {
      url,
      method = "POST",
      headers = {},
      body,
      secret,
      retryCount = 0,
      retryDelayMs = 1000,
      timeoutMs = 30000,
    } = params as Record<string, unknown> & WebhookConfig;

    const config: WebhookConfig = {
      url: String(url),
      method: (method as WebhookConfig["method"]) ?? "POST",
      headers: headers as Record<string, string>,
      secret: secret ? String(secret) : undefined,
      retryCount: Number(retryCount),
      retryDelayMs: Number(retryDelayMs),
      timeoutMs: Number(timeoutMs),
    };

    return this.callWebhook(config, body);
  }

  async action_sendBatch(params: Record<string, unknown>): Promise<WebhookCallResult[]> {
    const items = params.items as Array<Record<string, unknown>> | undefined;
    if (!items || !Array.isArray(items)) {
      throw new Error("'items' must be an array of webhook call configs");
    }

    const results: WebhookCallResult[] = [];
    for (const item of items) {
      const result = await this.action_send(item);
      results.push(result);
    }
    return results;
  }

  async action_generateSecret(_params: Record<string, unknown>): Promise<string> {
    return `whsec_${randomBytes(32).toString("hex")}`;
  }

  async action_signPayload(params: Record<string, unknown>): Promise<string> {
    const payload = params.payload ? JSON.stringify(params.payload) : "";
    const secret = String(params.secret ?? "");
    return createHmac("sha256", secret).update(payload).digest("hex");
  }

  private async callWebhook(
    config: WebhookConfig,
    body: unknown
  ): Promise<WebhookCallResult> {
    const maxAttempts = Math.max(1, (config.retryCount ?? 0) + 1);
    let lastError: string | null = null;

    const retryDelay = config.retryDelayMs ?? 1000;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0 && retryDelay) {
        await new Promise((r) => setTimeout(r, retryDelay * attempt));
      }

      const start = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs ?? 30000);

      try {
        const requestHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          "User-Agent": "RepurposeAI-Webhook/1.0",
          ...config.headers,
        };

        if (config.secret && body) {
          const payload = JSON.stringify(body);
          requestHeaders["X-Webhook-Signature"] = createHmac("sha256", config.secret)
            .update(payload)
            .digest("hex");
        }

        const response = await fetch(config.url, {
          method: config.method ?? "POST",
          headers: requestHeaders,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseBody = await response.text().catch(() => null);
        const duration = Date.now() - start;

        return {
          success: response.ok,
          statusCode: response.status,
          body: responseBody,
          duration,
          error: response.ok ? null : `HTTP ${response.status}`,
        };
      } catch (err) {
        clearTimeout(timeoutId);
        const duration = Date.now() - start;
        lastError = err instanceof Error ? err.message : "Unknown error";

        if (attempt === maxAttempts - 1) {
          return {
            success: false,
            statusCode: null,
            body: null,
            duration,
            error: lastError,
          };
        }
      }
    }

    return {
      success: false,
      statusCode: null,
      body: null,
      duration: 0,
      error: lastError,
    };
  }
}

export const webhook = new WebhookIntegration();
