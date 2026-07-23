import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/ai/health-monitor", () => ({
  AiHealthMonitor: {
    getProviderHealth: vi.fn().mockResolvedValue({
      status: "healthy",
      latency: 50,
      errorRate: 0,
      successRate: 100,
      totalCalls: 10,
      consecutiveFailures: 0,
      lastErrorAt: null,
      lastSuccessAt: new Date().toISOString(),
    }),
    isProviderHealthy: vi.fn().mockResolvedValue(true),
    recordSuccess: vi.fn().mockResolvedValue(undefined),
    recordFailure: vi.fn().mockResolvedValue(undefined),
    getAllProviderHealth: vi.fn().mockResolvedValue([]),
    getProviderScore: vi.fn().mockResolvedValue(100),
  },
}));

import { ProviderRouter } from "@/lib/ai/provider-router";
import { ProviderRegistry } from "@/lib/ai/provider-registry";
import { ProviderInterface, ProviderType, ModelCapability, ChatParams, ChatResult, HealthCheckResult, CostEstimate } from "@/lib/ai/provider-interface";

class MockProvider implements ProviderInterface {
  readonly name: string;
  readonly displayName: string;
  readonly type: ProviderType = "openai";
  readonly capabilities: ModelCapability[];

  private shouldFail: boolean;

  constructor(name: string, caps: ModelCapability[] = ["chat"], shouldFail = false) {
    this.name = name;
    this.displayName = name;
    this.capabilities = caps;
    this.shouldFail = shouldFail;
  }

  async chat(_params: ChatParams): Promise<ChatResult> {
    if (this.shouldFail) throw new Error("Provider error");
    return { content: `response from ${this.name}`, model: "mock", provider: this.name, usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }, latency: 100 };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return { healthy: true, latency: 50, model: this.name };
  }

  estimateCost(): CostEstimate {
    return { inputCost: 0, outputCost: 0, cachedCost: 0, totalCost: 0, currency: "USD" };
  }
}

describe("ProviderRouter", () => {
  beforeEach(() => {
    ProviderRegistry.getInstance().clear();
  });

  it("routes to the first healthy provider", async () => {
    ProviderRegistry.getInstance().register(new MockProvider("p1"));
    ProviderRegistry.getInstance().register(new MockProvider("p2"));

    const { provider, result } = await ProviderRouter.route(
      { messages: [{ role: "user", content: "hello" }] },
      { strategy: "auto" }
    );
    expect(provider).toBeDefined();
    expect(result.content).toBeTruthy();
  });

  it("fails over to next provider on error", async () => {
    ProviderRegistry.getInstance().register(new MockProvider("failing", ["chat"], true));
    ProviderRegistry.getInstance().register(new MockProvider("working"));

    const { provider } = await ProviderRouter.route(
      { messages: [{ role: "user", content: "hello" }] },
      { strategy: "auto", maxRetries: 0 }
    );
    expect(provider.name).toBe("working");
  });

  it("throws when no providers are registered", async () => {
    await expect(
      ProviderRouter.route({ messages: [{ role: "user", content: "hello" }] })
    ).rejects.toThrow("No suitable providers available");
  });

  it("selects preferred provider when specified", async () => {
    ProviderRegistry.getInstance().register(new MockProvider("p1"));
    ProviderRegistry.getInstance().register(new MockProvider("p2"));

    const { provider } = await ProviderRouter.route(
      { messages: [{ role: "user", content: "hello" }] },
      { preferredProvider: "p2" }
    );
    expect(provider.name).toBe("p2");
  });

  it("filters by required capability", async () => {
    ProviderRegistry.getInstance().register(new MockProvider("chat-only", ["chat"]));
    ProviderRegistry.getInstance().register(new MockProvider("embed-only", ["embedding"]));

    const { provider } = await ProviderRouter.route(
      { messages: [{ role: "user", content: "hello" }] },
      { requiredCapability: "chat" }
    );
    expect(provider.name).toBe("chat-only");
  });
});
