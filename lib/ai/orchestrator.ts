import { AiHealthMonitor } from "./health-monitor";
import { bootstrapProviders } from "./bootstrap";

export type ProviderName = "morphllm" | "gemini" | "openai" | "claude" | "openrouter";

export type RoutingStrategy = "auto" | "cheapest" | "fastest" | "quality" | "user_preference";

export interface ProviderConfig {
  name: ProviderName;
  displayName: string;
  baseUrl: string;
  apiKey: string | undefined;
  models: string[];
  defaultModel: string;
  priority: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  maxTokens: number;
  supportsStreaming: boolean;
}

export interface OrchestrationResult {
  content: string;
  model: string;
  provider: ProviderName;
  latency: number;
  tokensUsed: number;
  cost: number;
}

const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    name: "morphllm",
    displayName: "MorphLLM",
    baseUrl: process.env.AI_BASE_URL || "https://api.morphllm.com/v1",
    apiKey: process.env.AI_API_KEY,
    models: [process.env.AI_MODEL || "morph-glm52-744b"],
    defaultModel: process.env.AI_MODEL || "morph-glm52-744b",
    priority: 1,
    costPerInputToken: 0.000002,
    costPerOutputToken: 0.000008,
    maxTokens: 8192,
    supportsStreaming: true,
  },
  {
    name: "gemini",
    displayName: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKey: process.env.GEMINI_API_KEY,
    models: [process.env.GEMINI_MODEL || "gemini-1.5-flash", "gemini-1.5-pro"],
    defaultModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    priority: 2,
    costPerInputToken: 0.000001,
    costPerOutputToken: 0.000004,
    maxTokens: 8192,
    supportsStreaming: false,
  },
  {
    name: "openai",
    displayName: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY,
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    defaultModel: "gpt-4o-mini",
    priority: 3,
    costPerInputToken: 0.000003,
    costPerOutputToken: 0.000012,
    maxTokens: 16384,
    supportsStreaming: true,
  },
  {
    name: "claude",
    displayName: "Anthropic Claude",
    baseUrl: "https://api.anthropic.com/v1",
    apiKey: process.env.ANTHROPIC_API_KEY,
    models: ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
    defaultModel: "claude-3-haiku-20240307",
    priority: 4,
    costPerInputToken: 0.000003,
    costPerOutputToken: 0.000015,
    maxTokens: 8192,
    supportsStreaming: true,
  },
  {
    name: "openrouter",
    displayName: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    models: ["openai/gpt-4o", "anthropic/claude-3.5-sonnet", "google/gemini-1.5-flash"],
    defaultModel: "openai/gpt-4o",
    priority: 5,
    costPerInputToken: 0.000002,
    costPerOutputToken: 0.000008,
    maxTokens: 32768,
    supportsStreaming: true,
  },
];

export function getActiveProviders(): ProviderConfig[] {
  return PROVIDER_CONFIGS.filter((p) => p.apiKey);
}

export function getProvider(name: ProviderName): ProviderConfig | undefined {
  return PROVIDER_CONFIGS.find((p) => p.name === name);
}

function callOpenAiCompatible(
  config: ProviderConfig,
  prompt: string,
  options: { temperature?: number; maxTokens?: number; timeout?: number },
): Promise<{ content: string; model: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);
  return fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.defaultModel,
      messages: [{ role: "user", content: prompt }],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    }),
    signal: controller.signal,
  })
    .then(async (response) => {
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`${config.name} error: ${response.status}`);
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      return { content, model: data.model || config.defaultModel };
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      throw err;
    });
}

async function callGemini(
  config: ProviderConfig,
  prompt: string,
  options: { temperature?: number; maxTokens?: number; timeout?: number },
): Promise<{ content: string; model: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);
  try {
    const response = await fetch(
      `${config.baseUrl}/models/${config.defaultModel}:generateContent?key=${config.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 2048,
          },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return { content, model: config.defaultModel };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callAnthropic(
  config: ProviderConfig,
  prompt: string,
  options: { temperature?: number; maxTokens?: number; timeout?: number },
): Promise<{ content: string; model: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);
  try {
    const response = await fetch(`${config.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.defaultModel,
        max_tokens: options.maxTokens ?? 2048,
        messages: [{ role: "user", content: prompt }],
        temperature: options.temperature ?? 0.7,
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Claude error: ${response.status}`);
    const data = await response.json();
    const content = data.content?.[0]?.text || "";
    return { content, model: config.defaultModel };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callProvider(
  config: ProviderConfig,
  prompt: string,
  options: { temperature?: number; maxTokens?: number; timeout?: number },
): Promise<{ content: string; model: string }> {
  switch (config.name) {
    case "gemini":
      return callGemini(config, prompt, options);
    case "claude":
      return callAnthropic(config, prompt, options);
    case "openai":
    case "openrouter":
      return callOpenAiCompatible(config, prompt, options);
    default:
      return callOpenAiCompatible(config, prompt, options);
  }
}

export class AiOrchestrator {
  static async generate(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      timeout?: number;
      strategy?: RoutingStrategy;
      preferredProvider?: ProviderName;
      bypassHealth?: boolean;
    },
  ): Promise<OrchestrationResult> {
    bootstrapProviders();
    const strategy = options?.strategy ?? "auto";
    const activeProviders = getActiveProviders();

    if (activeProviders.length === 0) {
      throw new Error("No AI providers configured");
    }

    if (!options?.bypassHealth) {
      await AiHealthMonitor.recoverProviders();
    }

    const orderedProviders = await this.orderByStrategy(
      activeProviders,
      strategy,
      options?.preferredProvider,
    );

    const errors: Array<{ provider: string; error: string }> = [];
    const startTime = Date.now();

    for (const config of orderedProviders) {
      if (!options?.bypassHealth) {
        const isHealthy = await AiHealthMonitor.isProviderHealthy(config.name);
        if (!isHealthy) {
          errors.push({ provider: config.name, error: "Provider is unhealthy" });
          continue;
        }
      }

      try {
        const callStart = Date.now();
        const result = await callProvider(config, prompt, {
          temperature: options?.temperature ?? 0.7,
          maxTokens: options?.maxTokens ?? 2048,
          timeout: options?.timeout ?? 30000,
        });
        const latency = Date.now() - callStart;

        await AiHealthMonitor.recordSuccess(config.name, latency);

        const inputTokens = Math.ceil(prompt.length / 4);
        const outputTokens = Math.ceil(result.content.length / 4);

        return {
          content: result.content,
          model: result.model,
          provider: config.name,
          latency,
          tokensUsed: inputTokens + outputTokens,
          cost: inputTokens * config.costPerInputToken + outputTokens * config.costPerOutputToken,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        await AiHealthMonitor.recordFailure(config.name, errorMsg);
        errors.push({ provider: config.name, error: errorMsg });
      }
    }

    const totalTime = Date.now() - startTime;
    throw new Error(
      `All providers failed after ${totalTime}ms: ${errors.map((e) => `${e.provider}: ${e.error}`).join("; ")}`,
    );
  }

  static async generateWithFallback(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      timeout?: number;
      strategy?: RoutingStrategy;
    },
  ): Promise<OrchestrationResult> {
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.generate(prompt, {
          ...options,
          strategy: attempt > 0 ? "fastest" : options?.strategy,
          bypassHealth: attempt > 0,
        });
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError ?? new Error("All generation attempts failed");
  }

  private static async orderByStrategy(
    providers: ProviderConfig[],
    strategy: RoutingStrategy,
    preferredProvider?: ProviderName,
  ): Promise<ProviderConfig[]> {
    const sorted = [...providers];

    switch (strategy) {
      case "cheapest":
        sorted.sort((a, b) => a.costPerOutputToken - b.costPerOutputToken);
        break;
      case "fastest":
        sorted.sort((a, b) => a.priority - b.priority);
        break;
      case "quality":
        sorted.sort((a, b) => b.costPerOutputToken - a.costPerOutputToken);
        break;
      case "user_preference":
        if (preferredProvider) {
          const preferred = sorted.find((p) => p.name === preferredProvider);
          if (preferred) {
            sorted.splice(sorted.indexOf(preferred), 1);
            sorted.unshift(preferred);
          }
        }
        break;
      case "auto":
      default: {
        const healthOrder = await Promise.all(
          sorted.map(async (p) => ({
            provider: p,
            health: await AiHealthMonitor.getProviderScore(p.name),
          })),
        );
        healthOrder.sort((a, b) => b.health - a.health);
        sorted.splice(0, sorted.length, ...healthOrder.map((h) => h.provider));
        break;
      }
    }

    return sorted;
  }

  static async estimateCost(
    prompt: string,
    provider?: ProviderName,
  ): Promise<{ provider: string; estimatedCost: number; inputTokens: number; outputTokens: number }> {
    const config = provider ? getProvider(provider) : getActiveProviders()[0];
    if (!config) throw new Error("No provider available");

    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(inputTokens * 0.6);
    const estimatedCost =
      inputTokens * config.costPerInputToken + outputTokens * config.costPerOutputToken;

    return {
      provider: config.name,
      estimatedCost: Math.round(estimatedCost * 1000000) / 1000000,
      inputTokens,
      outputTokens,
    };
  }

  static async listProviders(): Promise<
    Array<{
      name: ProviderName;
      displayName: string;
      available: boolean;
      models: string[];
      status?: string;
    }>
  > {
    return Promise.all(
      PROVIDER_CONFIGS.map(async (p) => {
        const health = await AiHealthMonitor.getProviderHealth(p.name);
        return {
          name: p.name,
          displayName: p.displayName,
          available: !!p.apiKey,
          models: p.models,
          status: health?.status ?? "unknown",
        };
      }),
    );
  }
}
