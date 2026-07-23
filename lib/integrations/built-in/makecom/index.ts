import {
  BaseIntegration,
  BaseIntegrationConfig,
} from "../_base";
import {
  SyncResult,
  HealthCheckResult,
} from "../../types";

const CONFIG: BaseIntegrationConfig = {
  id: "makecom",
  name: "Make.com",
  version: "1.0.0",
  icon: "zap",
  description: "Automate workflows with Make.com (formerly Integromat) scenarios and webhooks",
  category: "Automation",
  type: "AUTOMATION",
  permissions: ["read:scenarios", "write:webhooks", "read:executions"],
  hasOAuth: true,
  hasWebhooks: true,
  oauthProvider: "MAKECOM",
  rateLimit: { requestsPerSecond: 5, maxRetries: 3, baseDelayMs: 1000 },
};

interface Scenario {
  id: number;
  name: string;
  description: string;
  schedulingEnabled: boolean;
  schedulingType: string | null;
  lastExecution: string | null;
  lastExecutionStatus: string | null;
}

interface Execution {
  id: string;
  scenarioId: number;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  duration: number | null;
  operations: number;
  error: string | null;
}

export class MakeIntegration extends BaseIntegration {
  private apiBase = "https://eu1.make.com/api/v2";
  private apiKey: string = "";

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
      this.apiKey = credentials.apiKey ?? "";

      if (!this.apiKey) {
        return { healthy: false, message: "No API key configured" };
      }

      await this.apiRequest<{ version: string }>(
        `${this.apiBase}/version`,
        { headers: { Authorization: `Token ${this.apiKey}` } }
      );

      return {
        healthy: true,
        latency: Date.now() - start,
        message: "Make.com API is accessible",
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
    this.apiKey = credentials.apiKey ?? "";

    const scenarios = await this.fetchScenarios();

    return {
      success: true,
      recordsProcessed: scenarios.length,
      metadata: {
        scenarios: scenarios.length,
        scenariosList: scenarios.map((s) => ({
          id: s.id,
          name: s.name,
          status: s.schedulingEnabled ? "active" : "inactive",
          lastExecution: s.lastExecution,
        })),
      },
    };
  }

  async action_triggerWebhook(params: Record<string, unknown>): Promise<unknown> {
    const webhookUrl = String(params.webhookUrl ?? "");
    const payload = params.payload ?? {};

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (params.secret) {
      headers["X-Make-Signature"] = String(params.secret);
    }

    return this.apiRequest(webhookUrl, {
      method: "POST",
      headers,
      body: payload,
    });
  }

  async action_listScenarios(params: Record<string, unknown>): Promise<unknown> {
    const credentials = await this.getCredentials(String(params.installedId));
    this.apiKey = credentials.apiKey ?? "";
    return this.fetchScenarios();
  }

  async action_getExecutions(params: Record<string, unknown>): Promise<unknown> {
    const credentials = await this.getCredentials(String(params.installedId));
    this.apiKey = credentials.apiKey ?? "";
    const scenarioId = Number(params.scenarioId ?? 0);

    const data = await this.apiRequest<{ executions: Execution[] }>(
      `${this.apiBase}/scenarios/${scenarioId}/executions?limit=${String(params.limit ?? 50)}`,
      { headers: { Authorization: `Token ${this.apiKey}` } }
    );

    return data.executions.map((e) => ({
      id: e.id,
      scenarioId: e.scenarioId,
      status: e.status,
      startedAt: e.startedAt,
      finishedAt: e.finishedAt,
      duration: e.duration,
      operations: e.operations,
      error: e.error,
    }));
  }

  async action_enableScenario(params: Record<string, unknown>): Promise<unknown> {
    const credentials = await this.getCredentials(String(params.installedId));
    this.apiKey = credentials.apiKey ?? "";
    const scenarioId = Number(params.scenarioId ?? 0);

    return this.apiRequest(
      `${this.apiBase}/scenarios/${scenarioId}/enable`,
      {
        method: "POST",
        headers: { Authorization: `Token ${this.apiKey}` },
      }
    );
  }

  async action_disableScenario(params: Record<string, unknown>): Promise<unknown> {
    const credentials = await this.getCredentials(String(params.installedId));
    this.apiKey = credentials.apiKey ?? "";
    const scenarioId = Number(params.scenarioId ?? 0);

    return this.apiRequest(
      `${this.apiBase}/scenarios/${scenarioId}/disable`,
      {
        method: "POST",
        headers: { Authorization: `Token ${this.apiKey}` },
      }
    );
  }

  async action_createHook(params: Record<string, unknown>): Promise<unknown> {
    const credentials = await this.getCredentials(String(params.installedId));
    this.apiKey = credentials.apiKey ?? "";
    const scenarioId = Number(params.scenarioId ?? 0);
    const name = String(params.name ?? "Repurpose AI Hook");

    return this.apiRequest(
      `${this.apiBase}/hooks`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: { scenarioId, name },
      }
    );
  }

  private async fetchScenarios(): Promise<Scenario[]> {
    const all: Scenario[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const data = await this.apiRequest<{
        scenarios: Scenario[];
        pagination: { total: number; page: number; pageSize: number; hasMore: boolean };
      }>(
        `${this.apiBase}/scenarios?page=${page}&pageSize=100`,
        { headers: { Authorization: `Token ${this.apiKey}` } }
      );

      all.push(...data.scenarios);
      hasMore = data.pagination.hasMore;
      page++;
    }

    return all;
  }
}

export const make = new MakeIntegration();
