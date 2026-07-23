import { ProviderRegistry } from "./provider-registry";
import { ChatParams, ChatResult, ProviderInterface } from "./provider-interface";
import { AiHealthMonitor } from "./health-monitor";
import type { ProviderName } from "./orchestrator";

export type RoutingStrategy = "auto" | "cheapest" | "fastest" | "quality" | "priority";

interface RouterOptions {
  strategy?: RoutingStrategy;
  preferredProvider?: string;
  requiredCapability?: string;
  organizationId?: string;
  maxRetries?: number;
}

interface ProviderScore {
  provider: ProviderInterface;
  score: number;
  reasons: string[];
}

export class ProviderRouter {
  static async route(
    params: ChatParams,
    options: RouterOptions = {}
  ): Promise<{ provider: ProviderInterface; result: ChatResult }> {
    const registry = ProviderRegistry.getInstance();
    const providers = registry.getAll().filter((p) => {
      if (options.preferredProvider && p.name !== options.preferredProvider) return false;
      if (options.requiredCapability && !p.capabilities.includes(options.requiredCapability as any)) return false;
      return true;
    });

    if (providers.length === 0) {
      throw new Error("No suitable providers available");
    }

    const strategy = options.strategy || "auto";
    const scored = await this.scoreProviders(providers, strategy, params);

    if (scored.length === 0) {
      throw new Error("All providers are unhealthy");
    }

    const maxRetries = options.maxRetries ?? 1;

    for (const candidate of scored) {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const startTime = Date.now();
          const result = await candidate.provider.chat(params);
          const latency = Date.now() - startTime;

          await AiHealthMonitor.recordSuccess(candidate.provider.name as ProviderName, latency);
          return { provider: candidate.provider, result };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          await AiHealthMonitor.recordFailure(candidate.provider.name as ProviderName, msg);
          if (attempt < maxRetries) continue;
          break;
        }
      }
    }

    throw new Error("All providers failed after retries");
  }

  private static async scoreProviders(
    providers: ProviderInterface[],
    strategy: RoutingStrategy,
    params: ChatParams
  ): Promise<ProviderScore[]> {
    const healthChecks = await Promise.allSettled(
      providers.map((p) => this.scoreProvider(p, strategy, params))
    );

    return healthChecks
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<ProviderScore>).value)
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  private static async scoreProvider(
    provider: ProviderInterface,
    strategy: RoutingStrategy,
    _params: ChatParams
  ): Promise<ProviderScore> {
    const reasons: string[] = [];
    let score = 100;

    const health = await AiHealthMonitor.getProviderHealth(provider.name as ProviderName);
    if (!health) return { provider, score: 0, reasons: ["No health data"] };

    if (health.status === "disabled" || health.status === "unhealthy") {
      return { provider, score: 0, reasons: [`Provider ${health.status}`] };
    }

    if (health.status === "degraded") score -= 30;

    if (strategy === "cheapest") {
      const costPerToken = 0.000003;
      score -= Math.min(costPerToken * 100000, 40);
    }

    if (strategy === "fastest") {
      if (health.latency > 5000) score -= 50;
      else if (health.latency > 2000) score -= 20;
      else score += 10;
    }

    score -= health.errorRate * 50;

    score = Math.max(0, score);

    return { provider, score, reasons };
  }
}
