import { AIResponseCache } from "@/lib/ai/provider-cache";

describe("AIResponseCache", () => {
  describe("buildKey", () => {
    it("produces consistent keys for same input", () => {
      const params = { messages: [{ role: "user", content: "hello" }], model: "gpt-4" };
      const key1 = AIResponseCache.buildKey("openai", params.model, params.messages);
      const key2 = AIResponseCache.buildKey("openai", params.model, params.messages);
      expect(key1).toBe(key2);
    });

    it("produces different keys for different inputs", () => {
      const params1 = { messages: [{ role: "user", content: "hello" }], model: "gpt-4" };
      const params2 = { messages: [{ role: "user", content: "world" }], model: "gpt-4" };
      const key1 = AIResponseCache.buildKey("openai", params1.model, params1.messages);
      const key2 = AIResponseCache.buildKey("openai", params2.model, params2.messages);
      expect(key1).not.toBe(key2);
    });

    it("produces different keys for different providers", () => {
      const params = { messages: [{ role: "user", content: "hello" }], model: "gpt-4" };
      const key1 = AIResponseCache.buildKey("openai", params.model, params.messages);
      const key2 = AIResponseCache.buildKey("anthropic", params.model, params.messages);
      expect(key1).not.toBe(key2);
    });

    it("produces different keys for different models", () => {
      const params1 = { messages: [{ role: "user", content: "hello" }], model: "gpt-4" };
      const params2 = { messages: [{ role: "user", content: "hello" }], model: "gpt-3.5" };
      const key1 = AIResponseCache.buildKey("openai", params1.model, params1.messages);
      const key2 = AIResponseCache.buildKey("openai", params2.model, params2.messages);
      expect(key1).not.toBe(key2);
    });

    it("handles empty messages", () => {
      const params = { messages: [], model: "gpt-4" };
      const key = AIResponseCache.buildKey("openai", params.model, params.messages);
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });

    it("handles complex message content", () => {
      const params = {
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Tell me about AI." },
        ],
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 100,
      };
      const key = AIResponseCache.buildKey("openai", params.model, params.messages);
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });
  });
});