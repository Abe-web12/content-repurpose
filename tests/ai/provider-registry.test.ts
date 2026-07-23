import { ProviderRegistry } from "@/lib/ai/provider-registry";
import { ProviderInterface, ProviderType, ModelCapability, ChatParams, ChatResult, HealthCheckResult, CostEstimate } from "@/lib/ai/provider-interface";

class MockProvider implements ProviderInterface {
  readonly name: string;
  readonly displayName: string;
  readonly type: ProviderType = "openai";
  readonly capabilities: ModelCapability[] = ["chat", "stream"];

  constructor(name: string) {
    this.name = name;
    this.displayName = name;
  }

  async chat(_params: ChatParams): Promise<ChatResult> {
    return { content: "mock", model: "mock", provider: this.name, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, latency: 0 };
  }
  async healthCheck(): Promise<HealthCheckResult> {
    return { healthy: true, latency: 0 };
  }
  estimateCost(): CostEstimate {
    return { inputCost: 0, outputCost: 0, cachedCost: 0, totalCost: 0, currency: "USD" };
  }
}

describe("ProviderRegistry", () => {
  beforeEach(() => {
    ProviderRegistry.getInstance().clear();
  });

  it("is a singleton", () => {
    const a = ProviderRegistry.getInstance();
    const b = ProviderRegistry.getInstance();
    expect(a).toBe(b);
  });

  it("registers and retrieves a provider", () => {
    const p = new MockProvider("test");
    ProviderRegistry.getInstance().register(p);
    expect(ProviderRegistry.getInstance().get("test")).toBe(p);
  });

  it("throws when getting unregistered provider", () => {
    expect(() => ProviderRegistry.getInstance().get("nonexistent")).toThrow();
  });

  it("returns all providers", () => {
    const a = new MockProvider("a");
    const b = new MockProvider("b");
    ProviderRegistry.getInstance().register(a);
    ProviderRegistry.getInstance().register(b);
    expect(ProviderRegistry.getInstance().getAll()).toHaveLength(2);
  });

  it("filters by type", () => {
    const a = new MockProvider("a");
    (a as any).type = "openai";
    const b = new MockProvider("b");
    (b as any).type = "anthropic";
    ProviderRegistry.getInstance().register(a);
    ProviderRegistry.getInstance().register(b);
    expect(ProviderRegistry.getInstance().getByType("openai")).toHaveLength(1);
  });

  it("filters by capability", () => {
    const a = new MockProvider("a");
    (a as any).capabilities = ["chat"];
    const b = new MockProvider("b");
    (b as any).capabilities = ["embedding"];
    ProviderRegistry.getInstance().register(a);
    ProviderRegistry.getInstance().register(b);
    expect(ProviderRegistry.getInstance().getByCapability("embedding")).toHaveLength(1);
  });

  it("checks if provider exists", () => {
    const p = new MockProvider("exists");
    ProviderRegistry.getInstance().register(p);
    expect(ProviderRegistry.getInstance().has("exists")).toBe(true);
    expect(ProviderRegistry.getInstance().has("missing")).toBe(false);
  });

  it("clears all providers", () => {
    ProviderRegistry.getInstance().register(new MockProvider("a"));
    ProviderRegistry.getInstance().clear();
    expect(ProviderRegistry.getInstance().getAll()).toHaveLength(0);
  });
});
