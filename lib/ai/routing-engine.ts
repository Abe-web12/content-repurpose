import { AiOrchestrator, type ProviderName, type RoutingStrategy } from "./orchestrator";
import { AiHealthMonitor } from "./health-monitor";
import { redis } from "@/lib/redis";

export interface RoutingRule {
  id: string;
  name: string;
  condition: "content_type" | "content_length" | "platform" | "user_tier" | "time_of_day" | "random";
  operator: "equals" | "contains" | "gt" | "lt" | "gte" | "lte" | "in";
  value: string | number | string[];
  provider: ProviderName;
  strategy: RoutingStrategy;
  weight?: number;
  priority: number;
}

export interface RoutingDecision {
  provider: ProviderName;
  strategy: RoutingStrategy;
  rule: string | null;
  timestamp: string;
}

const RULES_KEY = "routing:rules";

export class RoutingEngine {
  static async evaluate(
    context: {
      contentType?: string;
      contentLength?: number;
      platform?: string;
      userTier?: string;
      userId?: string;
    },
    options?: { bypassHealth?: boolean },
  ): Promise<RoutingDecision> {
    const rules = await this.getRules();
    const activeRules = rules
      .filter((r) => {
        if (r.condition === "content_type" && r.operator === "equals" && context.contentType) {
          return r.value === context.contentType;
        }
        if (r.condition === "content_type" && r.operator === "contains" && context.contentType) {
          return (context.contentType as string).includes(r.value as string);
        }
        if (r.condition === "content_length") {
          const len = context.contentLength ?? 0;
          const val = r.value as number;
          if (r.operator === "gt") return len > val;
          if (r.operator === "lt") return len < val;
          if (r.operator === "gte") return len >= val;
          if (r.operator === "lte") return len <= val;
        }
        if (r.condition === "platform" && r.operator === "equals" && context.platform) {
          return r.value === context.platform;
        }
        if (r.condition === "platform" && r.operator === "in" && context.platform) {
          return (r.value as string[]).includes(context.platform);
        }
        if (r.condition === "user_tier" && r.operator === "equals" && context.userTier) {
          return r.value === context.userTier;
        }
        if (r.condition === "time_of_day") {
          const hour = new Date().getHours();
          const [start, end] = (r.value as string).split("-").map(Number);
          return hour >= start && hour < end;
        }
        if (r.condition === "random") {
          return Math.random() < ((r.value as number) / 100);
        }
        return false;
      })
      .sort((a, b) => b.priority - a.priority);

    if (activeRules.length > 0) {
      const totalWeight = activeRules.reduce((sum, r) => sum + (r.weight ?? 1), 0);
      let randomPoint = Math.random() * totalWeight;

      for (const rule of activeRules) {
        randomPoint -= rule.weight ?? 1;
        if (randomPoint <= 0) {
          return {
            provider: rule.provider,
            strategy: rule.strategy,
            rule: rule.id,
            timestamp: new Date().toISOString(),
          };
        }
      }
    }

    return {
      provider: (process.env.DEFAULT_AI_PROVIDER as ProviderName) ?? "morphllm",
      strategy: "auto",
      rule: null,
      timestamp: new Date().toISOString(),
    };
  }

  static async getRules(): Promise<RoutingRule[]> {
    const raw = await redis.get<RoutingRule[]>(RULES_KEY);
    return raw ?? [];
  }

  static async setRules(rules: RoutingRule[]): Promise<void> {
    await redis.set(RULES_KEY, rules);
  }

  static async addRule(rule: RoutingRule): Promise<void> {
    const rules = await this.getRules();
    rules.push(rule);
    await this.setRules(rules);
  }

  static async removeRule(ruleId: string): Promise<void> {
    const rules = await this.getRules();
    const filtered = rules.filter((r) => r.id !== ruleId);
    await this.setRules(filtered);
  }

  static async generateWithRouting(
    prompt: string,
    options?: {
      contentType?: string;
      contentLength?: number;
      platform?: string;
      userTier?: string;
      userId?: string;
      temperature?: number;
      maxTokens?: number;
      timeout?: number;
      forceProvider?: ProviderName;
      bypassHealth?: boolean;
    },
  ) {
    let routingDecision: RoutingDecision;

    if (options?.forceProvider) {
      routingDecision = {
        provider: options.forceProvider,
        strategy: "user_preference",
        rule: null,
        timestamp: new Date().toISOString(),
      };
    } else {
      routingDecision = await this.evaluate({
        contentType: options?.contentType,
        contentLength: options?.contentLength,
        platform: options?.platform,
        userTier: options?.userTier,
        userId: options?.userId,
      }, options);
    }

    const startTime = Date.now();
    const result = await AiOrchestrator.generate(prompt, {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      timeout: options?.timeout,
      strategy: routingDecision.strategy,
      preferredProvider: routingDecision.provider,
      bypassHealth: options?.bypassHealth,
    });

    return {
      ...result,
      routingDecision,
      totalTime: Date.now() - startTime,
    };
  }
}
