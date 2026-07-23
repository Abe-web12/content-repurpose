import { ProviderRegistry } from "./provider-registry";
import { ChatParams, ChatResult, ProviderInterface } from "./provider-interface";
import { AiHealthMonitor } from "./health-monitor";
import type { ProviderName } from "./orchestrator";

interface FallbackResult {
  result: ChatResult;
  provider: string;
  attempts: number;
  failures: Array<{ provider: string; error: string }>;
}

export class ProviderFallback {
  static async executeWithFallback(
    params: ChatParams,
    preferredProviders?: string[]
  ): Promise<FallbackResult> {
    const registry = ProviderRegistry.getInstance();
    const failures: Array<{ provider: string; error: string }> = [];
    let attempts = 0;

    const providerOrder: ProviderInterface[] = preferredProviders?.length
      ? preferredProviders
          .map((name) => {
            try {
              return registry.get(name);
            } catch {
              return null;
            }
          })
          .filter((p): p is ProviderInterface => p !== null)
      : registry.getAll().filter((p) => p.capabilities.includes("chat" as any));

    for (const provider of providerOrder) {
      const isHealthy = await AiHealthMonitor.isProviderHealthy(provider.name as ProviderName);
      if (!isHealthy) {
        failures.push({ provider: provider.name, error: "Provider unhealthy" });
        continue;
      }

      const retries = 2;
      for (let attempt = 0; attempt < retries; attempt++) {
        attempts++;
        try {
          const startTime = Date.now();
          const result = await provider.chat(params);
          const latency = Date.now() - startTime;

          await AiHealthMonitor.recordSuccess(provider.name as ProviderName, latency);
          return { result, provider: provider.name, attempts, failures };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Request failed";
          await AiHealthMonitor.recordFailure(provider.name as ProviderName, msg);
          if (attempt < retries - 1) continue;
          failures.push({ provider: provider.name, error: msg });
        }
      }
    }

    throw new Error(
      `All providers failed after ${attempts} attempts. Failures: ${failures.map((f) => `${f.provider}: ${f.error}`).join("; ")}`
    );
  }
}
