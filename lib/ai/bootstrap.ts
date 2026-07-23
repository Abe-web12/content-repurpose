import { ProviderRegistry } from "./provider-registry";
import { OpenaiProvider } from "./providers/openai-provider";
import { AnthropicProvider } from "./providers/anthropic-provider";
import { GeminiProvider } from "./providers/gemini-provider";
import { MorphllmProvider } from "./providers/morphllm-provider";
import { OpenrouterProvider } from "./providers/openrouter-provider";
import { MistralProvider } from "./providers/mistral-provider";
import { GroqProvider } from "./providers/groq-provider";
import { DeepseekProvider } from "./providers/deepseek-provider";

let bootstrapped = false;

function hasApiKey(provider: { name: string }): boolean {
  const keyMap: Record<string, string> = {
    morphllm: "AI_API_KEY",
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    gemini: "GOOGLE_API_KEY",
    groq: "GROQ_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    mistral: "MISTRAL_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
  };
  const envKey = keyMap[provider.name];
  return envKey ? !!process.env[envKey] : false;
}

export function bootstrapProviders(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  const registry = ProviderRegistry.getInstance();

  const providers = [
    new MorphllmProvider(),
    new OpenaiProvider(),
    new AnthropicProvider(),
    new GeminiProvider(),
    new GroqProvider(),
    new DeepseekProvider(),
    new MistralProvider(),
    new OpenrouterProvider(),
  ];

  for (const provider of providers) {
    if (!hasApiKey(provider)) continue;
    try {
      registry.register(provider);
    } catch {
      // Provider may already be registered
    }
  }
}

export function isBootstrapped(): boolean {
  return bootstrapped;
}
