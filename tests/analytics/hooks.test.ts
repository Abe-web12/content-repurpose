import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAnalytics, useRevenue, useForecast, useUserGrowth, useAIUsage, useWorkflowMetrics, useContentMetrics, useExport } from "@/hooks/use-analytics";

vi.mock("@/components/ui/toast", () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockResponse(data: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
    headers: new Headers({ "Content-Disposition": "attachment; filename=test.csv" }),
    blob: () => Promise.resolve(new Blob(["data"])),
  } as Response);
}

describe("useAnalytics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches analytics data on mount", async () => {
    mockFetch.mockResolvedValue(mockResponse({ data: { overview: { totalGenerations: 100, changePct: 10, tokensUsed: 5000, tokensChangePct: 5, creditsUsed: 200, topFormat: "linkedin_post", avgPerDay: 3.3, avgPerDayPrevious: 3 }, formatBreakdown: {}, dailySeries: [], alerts: [], forecast: [], benchmarks: {} } }));
    const { result } = renderHook(() => useAnalytics(30));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.overview.totalGenerations).toBe(100);
  });

  it("handles fetch error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useAnalytics(30));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Network error");
  });

  it("refreshes when days change", async () => {
    mockFetch.mockResolvedValue(mockResponse({ data: { overview: { totalGenerations: 50 } } }));
    const { result, rerender } = renderHook(({ days }: { days: number }) => useAnalytics(days), { initialProps: { days: 7 } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("days=7"));
  });
});

describe("useRevenue", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches revenue data", async () => {
    mockFetch.mockResolvedValue(mockResponse({ data: { revenue: [{ date: "2024-01-01", mrr: 10000 }], metrics: { mrr: 10000 } } }));
    const { result } = renderHook(() => useRevenue("org1", "30d"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.revenue.length).toBe(1);
    expect(result.current.metrics?.mrr).toBe(10000);
  });

  it("handles error response", async () => {
    mockFetch.mockResolvedValue(mockResponse({ error: "Failed" }, false));
    const { result } = renderHook(() => useRevenue("org1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.revenue.length).toBe(0);
  });
});

describe("useForecast", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches forecast data", async () => {
    mockFetch.mockResolvedValue(mockResponse({ data: { metric: "revenue", predictions: [{ date: "2024-01-01", predicted: 100 }], trend: "up", confidence: 85, growth: 10, metadata: { historicalAvg: 100, predictedAvg: 110, seasonalityFactor: 0, rSquared: 0.8 } } }));
    const { result } = renderHook(() => useForecast("org1", "revenue", "30"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.prediction?.metric).toBe("revenue");
    expect(result.current.prediction?.trend).toBe("up");
  });
});



describe("useUserGrowth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches user growth data", async () => {
    mockFetch.mockResolvedValue(mockResponse({ data: { growth: [{ date: "2024-01-01", activeCustomers: 100 }], segments: [{ name: "Active", count: 80, percentage: 80, description: "desc" }], retentionRate: 85 } }));
    const { result } = renderHook(() => useUserGrowth("org1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.growth.length).toBe(1);
    expect(result.current.retentionRate).toBe(85);
  });
});

describe("useAIUsage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches AI usage data", async () => {
    mockFetch.mockResolvedValue(mockResponse({ data: { metrics: [{ date: "2024-01-01", requests: 100 }], providers: [{ providerId: "openai", requests: 50 }], overview: { totalRequests: 100, totalTokens: 5000, totalCost: 0.5, averageLatency: 200, successRate: 95 } } }));
    const { result } = renderHook(() => useAIUsage("org1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics.length).toBe(1);
    expect(result.current.overview?.totalRequests).toBe(100);
  });
});

describe("useWorkflowMetrics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches workflow data", async () => {
    mockFetch.mockResolvedValue(mockResponse({ data: [{ date: "2024-01-01", runs: 10, successCount: 8, failedCount: 2 }] }));
    const { result } = renderHook(() => useWorkflowMetrics("org1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data.length).toBe(1);
  });
});

describe("useContentMetrics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches content metrics", async () => {
    mockFetch.mockResolvedValue(mockResponse({ data: { totalGenerations: 50, totalTokens: 10000, favoriteCount: 5, byFormat: {}, byInputType: {}, byModel: {}, dailySeries: [] } }));
    const { result } = renderHook(() => useContentMetrics(30));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.totalGenerations).toBe(50);
  });
});

describe("useExport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("triggers download on export", async () => {
    const createObjectURL = vi.fn(() => "blob:url");
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["data"])),
      headers: new Headers({ "Content-Disposition": "attachment; filename=test.csv" }),
    } as Response);

    const { result } = renderHook(() => useExport());
    result.current.exportData("generations", "csv");
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
  });
});
