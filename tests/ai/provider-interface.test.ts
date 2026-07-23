import { ProviderType, ModelCapability } from "@/lib/ai/provider-interface";

describe("ProviderType", () => {
  it("includes all expected provider types", () => {
    const types: ProviderType[] = ["openai", "anthropic", "google", "morphllm", "openrouter", "mistral", "groq", "deepseek", "azure", "custom"];
    expect(types).toContain("openai");
    expect(types).toContain("anthropic");
    expect(types).toContain("google");
    expect(types).toContain("morphllm");
    expect(types).toContain("openrouter");
    expect(types).toContain("mistral");
    expect(types).toContain("groq");
    expect(types).toContain("deepseek");
  });
});

describe("ModelCapability", () => {
  it("includes all expected capabilities", () => {
    const caps: ModelCapability[] = ["chat", "stream", "vision", "embedding", "audio", "image", "code", "reasoning", "function_calling"];
    expect(caps).toContain("chat");
    expect(caps).toContain("stream");
    expect(caps).toContain("vision");
    expect(caps).toContain("embedding");
    expect(caps).toContain("audio");
    expect(caps).toContain("image");
    expect(caps).toContain("code");
    expect(caps).toContain("reasoning");
    expect(caps).toContain("function_calling");
  });
});
