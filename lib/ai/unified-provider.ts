import { AI_MODEL, generateStream, generateComplete } from "./provider";

interface AICompletionOptions {
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retries?: number;
}

interface AICompletionResult {
  content: string;
  model: string;
  provider: string;
}

interface ProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string | undefined;
  model: string;
  priority: number;
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: "morphllm",
    baseUrl: process.env.AI_BASE_URL || "https://api.morphllm.com/v1",
    apiKey: process.env.AI_API_KEY,
    model: AI_MODEL,
    priority: 1,
  },
  {
    name: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    priority: 2,
  },
];

const DEFAULT_OPTIONS: AICompletionOptions = {
  temperature: 0.7,
  maxTokens: 2048,
  timeout: 30000,
  retries: 2,
};

async function callProvider(
  config: ProviderConfig,
  prompt: string,
  options: AICompletionOptions
): Promise<AICompletionResult> {
  if (!config.apiKey) {
    throw new Error(`${config.name}: API key not configured`);
  }

  if (config.name === "gemini") {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);
    try {
      const response = await fetch(
        `${config.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`,
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
        }
      );
      if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return { content, model: config.model, provider: config.name };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: prompt }],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${config.name} error: ${response.status}`);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    return { content, model: config.model, provider: config.name };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateWithFallback(
  prompt: string,
  options: AICompletionOptions = {}
): Promise<AICompletionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const activeProviders = PROVIDERS.filter((p) => p.apiKey).sort((a, b) => a.priority - b.priority);

  if (activeProviders.length === 0) {
    throw new Error("No AI providers configured");
  }

  const errors: { provider: string; error: string }[] = [];
  for (const provider of activeProviders) {
    for (let attempt = 0; attempt <= (opts.retries || 0); attempt++) {
      try {
        return await callProvider(provider, prompt, opts);
      } catch (err: any) {
        if (attempt < (opts.retries || 0)) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        errors.push({ provider: provider.name, error: err.message || "Unknown error" });
      }
    }
  }
  throw new Error(
    `All AI providers failed: ${errors.map((e) => `${e.provider}: ${e.error}`).join("; ")}`
  );
}

export function generateStreamWithFallback(
  prompt: string
): ReturnType<typeof generateStream> {
  return generateStream(prompt);
}

export function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateCost(
  promptTokens: number,
  completionTokens: number,
  provider: string
): number {
  const rates: Record<string, { input: number; output: number }> = {
    morphllm: { input: 0.000002, output: 0.000008 },
    gemini: { input: 0.000001, output: 0.000004 },
  };
  const rate = rates[provider] || rates.morphllm;
  return promptTokens * rate.input + completionTokens * rate.output;
}
