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
    }),
    isProviderHealthy: vi.fn().mockResolvedValue(true),
    recordSuccess: vi.fn().mockResolvedValue(undefined),
    recordFailure: vi.fn().mockResolvedValue(undefined),
    getAllProviderHealth: vi.fn().mockResolvedValue([]),
    getProviderScore: vi.fn().mockResolvedValue(100),
  },
}));

import { ProviderFallback } from "@/lib/ai/provider-fallback";
import { ProviderRegistry } from "@/lib/ai/provider-registry";
import { ProviderInterface, ProviderType, ModelCapability, ChatParams, ChatResult, HealthCheckResult, CostEstimate } from "@/lib/ai/provider-interface";

class MockProvider implements ProviderInterface {
  readonly name: string;
  readonly displayName: string;
  readonly type: ProviderType = "openai";
  readonly capabilities: ModelCapability[];
  private failCount: number;
  private callCount = 0;

  constructor(name: string, failCount = 0, caps: ModelCapability[] = ["chat"]) {
    this.name = name;
    this.displayName = name;
    this.failCount = failCount;
    this.capabilities = caps;
  }

  async chat(_params: ChatParams): Promise<ChatResult> {
    this.callCount++;
    if (this.callCount <= this.failCount) throw new Error("Simulated failure");
    return { content: `ok from ${this.name}`, model: "mock", provider: this.name, usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }, latency: 50 };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return { healthy: true, latency: 50 };
  }

  estimateCost(): CostEstimate {
    return { inputCost: 0, outputCost: 0, cachedCost: 0, totalCost: 0, currency: "USD" };
  }
}

describe("ProviderFallback", () => {
  beforeEach(() => {
    ProviderRegistry.getInstance().clear();
  });

  it("succeeds on first provider", async () => {
    ProviderRegistry.getInstance().register(new MockProvider("p1"));

    const result = await ProviderFallback.executeWithFallback(
      { messages: [{ role: "user", content: "hello" }] }
    );
    expect(result.provider).toBe("p1");
    expect(result.attempts).toBe(1);
    expect(result.failures).toHaveLength(0);
  });

  it("retries on failure and succeeds", async () => {
    ProviderRegistry.getInstance().register(new MockProvider("p1", 1));

    const result = await ProviderFallback.executeWithFallback(
      { messages: [{ role: "user", content: "hello" }] }
    );
    expect(result.provider).toBe("p1");
    expect(result.attempts).toBe(2);
  });

  it("uses preferred providers when specified", async () => {
    ProviderRegistry.getInstance().register(new MockProvider("p1"));
    ProviderRegistry.getInstance().register(new MockProvider("p2"));
    ProviderRegistry.getInstance().register(new MockProvider("p3"));

    const result = await ProviderFallback.executeWithFallback(
      { messages: [{ role: "user", content: "hello" }] },
      ["p3", "p1"]
    );
    expect(result.provider).toBe("p3");
  });

  it("throws when all providers fail", async () => {
    ProviderRegistry.getInstance().register(new MockProvider("p1", 5));
    ProviderRegistry.getInstance().register(new MockProvider("p2", 5));

    await expect(
      ProviderFallback.executeWithFallback(
        { messages: [{ role: "user", content: "hello" }] }
      )
    ).rejects.toThrow("All providers failed");
  });
});
