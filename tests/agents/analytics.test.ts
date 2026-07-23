import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aIAgentRun: {
      findMany: vi.fn(),
    },
    aIAgentTask: {
      findMany: vi.fn(),
    },
    aIAgentMemory: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    aIAgentKnowledgeBase: {
      findMany: vi.fn(),
    },
    aIAgentKnowledgeDocument: {
      groupBy: vi.fn().mockResolvedValue([]),
      findMany: vi.fn(),
    },
    aIAgentAnalytics: {
      upsert: vi.fn(),
    },
    aiAgentRuns: {
      findMany: vi.fn(),
    },
    aiAgentTasks: {
      findMany: vi.fn(),
    },
    aiAgentMemories: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    aiAgentKnowledgeBases: {
      findMany: vi.fn(),
    },
    aiAgentKnowledgeDocuments: {
      groupBy: vi.fn().mockResolvedValue([]),
      findMany: vi.fn(),
    },
    aiAgentAnalytics: {
      upsert: vi.fn(),
    },
  },
}));

import { AgentAnalytics } from "@/lib/agents/analytics";
import { prisma } from "@/lib/prisma";

describe("AgentAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getRunStats", () => {
    it("returns default stats for no runs", async () => {
      vi.mocked(prisma.aiAgentRuns.findMany).mockResolvedValue([]);
      const stats = await AgentAnalytics.getRunStats("agent-1");
      expect(stats.totalRuns).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.avgDuration).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.totalCost).toBe(0);
    });

    it("calculates stats for mixed runs", async () => {
      vi.mocked(prisma.aiAgentRuns.findMany).mockResolvedValue([
        { status: "COMPLETED", duration: 100, tokensUsed: 50, cost: 0.01 },
        { status: "COMPLETED", duration: 200, tokensUsed: 100, cost: 0.02 },
        { status: "FAILED", duration: 50, tokensUsed: 20, cost: 0.005 },
        { status: "COMPLETED", duration: null, tokensUsed: 0, cost: 0 },
      ] as any);
      const stats = await AgentAnalytics.getRunStats("agent-1");
      expect(stats.totalRuns).toBe(4);
      expect(stats.successCount).toBe(3);
      expect(stats.failureCount).toBe(1);
      expect(stats.successRate).toBe(75);
      expect(stats.avgDuration).toBe(350 / 3);
      expect(stats.totalTokens).toBe(170);
      expect(stats.totalCost).toBeCloseTo(0.035, 5);
    });

    it("handles only failed runs", async () => {
      vi.mocked(prisma.aiAgentRuns.findMany).mockResolvedValue([
        { status: "FAILED", duration: 30, tokensUsed: 10, cost: 0.001 },
        { status: "FAILED", duration: 60, tokensUsed: 15, cost: 0.002 },
      ] as any);
      const stats = await AgentAnalytics.getRunStats("agent-1");
      expect(stats.totalRuns).toBe(2);
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(2);
      expect(stats.successRate).toBe(0);
    });

    it("calculates avgDuration excluding null durations", async () => {
      vi.mocked(prisma.aiAgentRuns.findMany).mockResolvedValue([
        { status: "COMPLETED", duration: 100, tokensUsed: 0, cost: 0 },
        { status: "COMPLETED", duration: null, tokensUsed: 0, cost: 0 },
      ] as any);
      const stats = await AgentAnalytics.getRunStats("agent-1");
      expect(stats.avgDuration).toBe(100);
    });

    it("success rate is 100% for all completed", async () => {
      vi.mocked(prisma.aiAgentRuns.findMany).mockResolvedValue([
        { status: "COMPLETED", duration: 100, tokensUsed: 50, cost: 0.01 },
      ] as any);
      const stats = await AgentAnalytics.getRunStats("agent-1");
      expect(stats.successRate).toBe(100);
    });
  });

  describe("getToolUsage", () => {
    it("returns empty array for no tasks", async () => {
      vi.mocked(prisma.aiAgentTasks.findMany).mockResolvedValue([]);
      const usage = await AgentAnalytics.getToolUsage("agent-1");
      expect(usage).toEqual([]);
    });

    it("counts tool usage by type", async () => {
      vi.mocked(prisma.aiAgentTasks.findMany).mockResolvedValue([
        { toolType: "web_search" },
        { toolType: "web_search" },
        { toolType: "calculator" },
        { toolType: "web_search" },
      ] as any);
      const usage = await AgentAnalytics.getToolUsage("agent-1");
      expect(usage).toHaveLength(2);
      const webSearch = usage.find((u) => u.tool === "web_search");
      const calculator = usage.find((u) => u.tool === "calculator");
      expect(webSearch?.count).toBe(3);
      expect(calculator?.count).toBe(1);
    });

    it("handles tasks with null toolType", async () => {
      vi.mocked(prisma.aiAgentTasks.findMany).mockResolvedValue([
        { toolType: null },
        { toolType: "web_search" },
      ] as any);
      const usage = await AgentAnalytics.getToolUsage("agent-1");
      const unknown = usage.find((u) => u.tool === "unknown");
      expect(unknown?.count).toBe(1);
    });
  });

  describe("getMemoryStats", () => {
    it("handles empty memories", async () => {
      vi.mocked(prisma.aiAgentMemories.count).mockResolvedValue(0);
      vi.mocked(prisma.aiAgentMemories.groupBy).mockResolvedValue([]);
      const stats = await AgentAnalytics.getMemoryStats("agent-1");
      expect(stats.totalMemories).toBe(0);
      expect(stats.byType).toEqual([]);
    });

    it("returns breakdown by type", async () => {
      vi.mocked(prisma.aiAgentMemories.count).mockResolvedValue(10);
      vi.mocked(prisma.aiAgentMemories.groupBy).mockResolvedValue([
        { type: "SHORT_TERM", _count: 7 },
        { type: "LONG_TERM", _count: 3 },
      ] as any);
      const stats = await AgentAnalytics.getMemoryStats("agent-1");
      expect(stats.totalMemories).toBe(10);
      expect(stats.byType).toHaveLength(2);
      expect(stats.byType.find((b) => b.type === "SHORT_TERM")?.count).toBe(7);
      expect(stats.byType.find((b) => b.type === "LONG_TERM")?.count).toBe(3);
    });
  });

  describe("getKnowledgeStats", () => {
    it("returns empty array for no KBs", async () => {
      vi.mocked(prisma.aiAgentKnowledgeBases.findMany).mockResolvedValue([]);
      const stats = await AgentAnalytics.getKnowledgeStats("agent-1");
      expect(stats).toEqual([]);
    });

    it("returns document counts per KB", async () => {
      vi.mocked(prisma.aiAgentKnowledgeBases.findMany).mockResolvedValue([
        { id: "kb-1", name: "KB One" },
        { id: "kb-2", name: "KB Two" },
      ] as any);
      vi.mocked(prisma.aiAgentKnowledgeDocuments.groupBy).mockResolvedValue([
        { knowledgeBaseId: "kb-1", _count: 5 },
        { knowledgeBaseId: "kb-2", _count: 3 },
      ] as any);
      const stats = await AgentAnalytics.getKnowledgeStats("agent-1");
      expect(stats).toHaveLength(2);
      expect(stats[0].documentCount).toBe(5);
      expect(stats[1].documentCount).toBe(3);
    });

    it("returns KBs with zero documents", async () => {
      vi.mocked(prisma.aiAgentKnowledgeBases.findMany).mockResolvedValue([
        { id: "kb-1", name: "Empty KB" },
      ] as any);
      vi.mocked(prisma.aiAgentKnowledgeDocuments.groupBy).mockResolvedValue([] as any);
      const stats = await AgentAnalytics.getKnowledgeStats("agent-1");
      expect(stats[0].documentCount).toBe(0);
    });
  });

  describe("recordDaily", () => {
    it("creates daily analytics entry", async () => {
      vi.mocked(prisma.aiAgentAnalytics.upsert).mockResolvedValue({ id: "daily-1" } as any);
      await AgentAnalytics.recordDaily("agent-1", "org-1", {
        runsCount: 10,
        successCount: 8,
        failureCount: 2,
        totalTokens: 5000,
        totalCost: 0.5,
      });
      expect(prisma.aiAgentAnalytics.upsert).toHaveBeenCalled();
    });

    it("records with all optional fields", async () => {
      vi.mocked(prisma.aiAgentAnalytics.upsert).mockResolvedValue({ id: "daily-2" } as any);
      await AgentAnalytics.recordDaily("agent-1", "org-1", {
        runsCount: 1,
        successCount: 1,
        failureCount: 0,
        totalTokens: 100,
        totalCost: 0.01,
        avgLatency: 150,
        toolCalls: 5,
        memoryRetrievals: 10,
        knowledgeRetrievals: 3,
      });
      const call = vi.mocked(prisma.aiAgentAnalytics.upsert).mock.calls[0][0];
      expect(call.create.avgLatency).toBe(150);
      expect(call.create.toolCalls).toBe(5);
      expect(call.create.memoryRetrievals).toBe(10);
      expect(call.create.knowledgeRetrievals).toBe(3);
    });

    it("upserts with increment on existing entry", async () => {
      vi.mocked(prisma.aiAgentAnalytics.upsert).mockResolvedValue({ id: "daily-3" } as any);
      await AgentAnalytics.recordDaily("agent-1", "org-1", { runsCount: 10, successCount: 8, failureCount: 2, totalTokens: 5000, totalCost: 0.5 });
      const call = vi.mocked(prisma.aiAgentAnalytics.upsert).mock.calls[0][0];
      expect(call.update.runsCount).toEqual({ increment: 10 });
      expect(call.update.successCount).toEqual({ increment: 8 });
    });
  });
});
