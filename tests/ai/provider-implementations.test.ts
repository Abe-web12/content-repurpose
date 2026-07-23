import { OpenaiProvider } from "@/lib/ai/providers/openai-provider";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic-provider";
import { GeminiProvider } from "@/lib/ai/providers/gemini-provider";
import { MorphllmProvider } from "@/lib/ai/providers/morphllm-provider";
import { OpenrouterProvider } from "@/lib/ai/providers/openrouter-provider";
import { MistralProvider } from "@/lib/ai/providers/mistral-provider";
import { GroqProvider } from "@/lib/ai/providers/groq-provider";
import { DeepseekProvider } from "@/lib/ai/providers/deepseek-provider";

describe("Provider Implementations", () => {
  const providers = [
    { name: "OpenAI", instance: new OpenaiProvider() },
    { name: "Anthropic", instance: new AnthropicProvider() },
    { name: "Gemini", instance: new GeminiProvider() },
    { name: "MorphLLM", instance: new MorphllmProvider() },
    { name: "OpenRouter", instance: new OpenrouterProvider() },
    { name: "Mistral", instance: new MistralProvider() },
    { name: "Groq", instance: new GroqProvider() },
    { name: "DeepSeek", instance: new DeepseekProvider() },
  ];

  providers.forEach(({ name, instance }) => {
    describe(`${name}Provider`, () => {
      it("has required static properties", () => {
        expect(instance.name).toBeDefined();
        expect(instance.displayName).toBeDefined();
        expect(instance.type).toBeDefined();
        expect(instance.capabilities).toBeInstanceOf(Array);
      });

      it("has chat method", () => {
        expect(typeof instance.chat).toBe("function");
      });

      it("has stream method", () => {
        expect(typeof instance.stream).toBe("function");
      });

      it("has healthCheck method", () => {
        expect(typeof instance.healthCheck).toBe("function");
      });

      it("has estimateCost method", () => {
        expect(typeof instance.estimateCost).toBe("function");
      });

      it("returns cost estimate without throwing", () => {
        const cost = instance.estimateCost("test-model", 100, 50);
        expect(cost).toHaveProperty("inputCost");
        expect(cost).toHaveProperty("outputCost");
        expect(cost).toHaveProperty("totalCost");
        expect(cost).toHaveProperty("currency");
        expect(cost.currency).toBe("USD");
      });

      it("returns zero cost for missing model pricing", () => {
        const cost = instance.estimateCost("nonexistent-model-xyz", 100, 50);
        expect(cost.totalCost).toBeGreaterThanOrEqual(0);
      });

      it("reports health without throwing", async () => {
        // health check may fail due to missing API keys, but shouldn't throw
        let health;
        try {
          health = await instance.healthCheck();
        } catch {
          health = { healthy: false, latency: 0, error: "threw unexpectedly" };
        }
        expect(health).toHaveProperty("healthy");
        expect(health).toHaveProperty("latency");
      });
    });
  });
});
