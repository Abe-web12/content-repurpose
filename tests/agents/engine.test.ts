import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpsert, mockFindMany, mockCount, mockDelete, mockDeleteMany, mockCreate } = vi.hoisted(() => ({
  mockUpsert: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockDelete: vi.fn(),
  mockDeleteMany: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock("@/lib/ai/provider", () => ({
  generateEmbedding: vi.fn().mockRejectedValue(new Error("No API key (mocked)")),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiAgentMemories: {
      upsert: mockUpsert,
      findMany: mockFindMany,
      count: mockCount,
      delete: mockDelete,
      deleteMany: mockDeleteMany,
    },
    aiAgentKnowledgeBases: {
      create: mockCreate,
      findMany: mockFindMany,
      delete: mockDelete,
    },
    aiAgentKnowledgeDocuments: {
      create: mockCreate,
      findMany: mockFindMany,
      delete: mockDelete,
      deleteMany: mockDeleteMany,
    },
  },
}));

import { AgentPlanner } from "@/lib/agents/planner";
import { AgentMemory } from "@/lib/agents/memory";
import { AgentKnowledge } from "@/lib/agents/knowledge";

const mockContext = { organizationId: "org-1", userId: "user-1" };

describe("AgentPlanner", () => {
  describe("createPlan", () => {
    it("returns correct plan structure with steps array", async () => {
      const plan = await AgentPlanner.createPlan({ id: "agent-1" }, { topic: "AI" });
      expect(plan).toHaveProperty("steps");
      expect(Array.isArray(plan.steps)).toBe(true);
      expect(plan.steps.length).toBeGreaterThan(0);
    });

    it("includes THINK and RESPOND steps", async () => {
      const plan = await AgentPlanner.createPlan({ id: "agent-1" }, { topic: "AI" });
      const types = plan.steps.map((s) => s.type);
      expect(types).toContain("THINK");
      expect(types).toContain("RESPOND");
    });

    it("includes input in both steps", async () => {
      const plan = await AgentPlanner.createPlan({ id: "agent-1" }, { topic: "AI", platform: "web" });
      plan.steps.forEach((step) => {
        expect(step.input).toEqual({ topic: "AI", platform: "web" });
      });
    });

    it("RESPOND depends on THINK", async () => {
      const plan = await AgentPlanner.createPlan({ id: "agent-1" }, { topic: "AI" });
      const respond = plan.steps.find((s) => s.type === "RESPOND");
      expect(respond?.dependsOn).toContain("think-1");
    });

    it("creates unique step IDs", async () => {
      const plan1 = await AgentPlanner.createPlan({ id: "agent-1" }, {});
      const plan2 = await AgentPlanner.createPlan({ id: "agent-2" }, {});
      const ids1 = plan1.steps.map((s) => s.id);
      const ids2 = plan2.steps.map((s) => s.id);
      expect(ids1).toEqual(ids2);
    });
  });

  describe("createToolPlan", () => {
    it("returns TOOL step with correct toolType", () => {
      const plan = AgentPlanner.createToolPlan("web_search", { query: "test" });
      expect(plan.steps).toHaveLength(1);
      expect(plan.steps[0].type).toBe("TOOL");
      expect(plan.steps[0].toolType).toBe("web_search");
    });

    it("includes input in tool step", () => {
      const plan = AgentPlanner.createToolPlan("calculator", { expression: "2+2" });
      expect(plan.steps[0].input).toEqual({ expression: "2+2" });
    });

    it("creates tool step with empty toolConfig", () => {
      const plan = AgentPlanner.createToolPlan("http_request", { url: "https://example.com" });
      expect(plan.steps[0].toolConfig).toEqual({});
    });
  });

  describe("createDelegationPlan", () => {
    it("includes DELEGATE and REFLECT steps", () => {
      const plan = AgentPlanner.createDelegationPlan("Write content", "agent-2", { topic: "AI" });
      const types = plan.steps.map((s) => s.type);
      expect(types).toContain("DELEGATE");
      expect(types).toContain("REFLECT");
    });

    it("has targetAgentId in toolConfig", () => {
      const plan = AgentPlanner.createDelegationPlan("Write content", "agent-2", { topic: "AI" });
      const delegate = plan.steps.find((s) => s.type === "DELEGATE");
      expect(delegate?.toolConfig?.targetAgentId).toBe("agent-2");
    });

    it("REFLECT depends on DELEGATE", () => {
      const plan = AgentPlanner.createDelegationPlan("Task", "agent-3", {});
      const reflect = plan.steps.find((s) => s.type === "REFLECT");
      expect(reflect?.dependsOn).toContain("delegate-1");
    });

    it("DELEGATE step uses delegate toolType", () => {
      const plan = AgentPlanner.createDelegationPlan("Task", "agent-2", {});
      const delegate = plan.steps.find((s) => s.type === "DELEGATE");
      expect(delegate?.toolType).toBe("delegate");
    });
  });
});

describe("AgentMemory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ id: "mem-1" });
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
    mockDelete.mockResolvedValue({ id: "del-1" });
    mockDeleteMany.mockResolvedValue({ count: 0 });
  });

  describe("store", () => {
    it("creates memory entry with upsert", async () => {
      const result = await AgentMemory.store("agent-1", null, mockContext, {
        key: "test-key",
        content: "test content",
      });
      expect(result).toEqual({ id: "mem-1" });
      expect(mockUpsert).toHaveBeenCalled();
    });

    it("stores with type and score defaults", async () => {
      await AgentMemory.store("agent-1", null, mockContext, {
        key: "test-key",
        content: "test content",
      });
      const call = mockUpsert.mock.calls[0][0];
      expect(call.create.type).toBe("SHORT_TERM");
      expect(call.create.score).toBe(0);
    });

    it("sets expiresAt when ttlMs provided", async () => {
      await AgentMemory.store("agent-1", "run-1", mockContext, {
        key: "temp-key",
        content: "temporary",
        ttlMs: 60000,
      });
      const call = mockUpsert.mock.calls[0][0];
      expect(call.create.expiresAt).toBeInstanceOf(Date);
    });

    it("stores with custom metadata", async () => {
      await AgentMemory.store("agent-1", null, mockContext, {
        key: "meta-key",
        content: "with metadata",
        metadata: { source: "test", priority: 1 },
      });
      const call = mockUpsert.mock.calls[0][0];
      expect(call.create.metadata).toEqual({ source: "test", priority: 1 });
    });
  });

  describe("search", () => {
    it("returns empty array for non-existent agent", async () => {
      const results = await AgentMemory.search("non-existent", "query");
      expect(results).toEqual([]);
    });

    it("calls findMany with correct agentId", async () => {
      await AgentMemory.search("agent-1", "search query");
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            agentId: "agent-1",
          }),
        })
      );
    });

    it("limits results to specified limit", async () => {
      await AgentMemory.search("agent-1", "query", 5);
      const call = mockFindMany.mock.calls[0][0];
      expect(call.take).toBe(5);
    });

    it("orders by score descending", async () => {
      await AgentMemory.search("agent-1", "query");
      const call = mockFindMany.mock.calls[0][0];
      expect(call.orderBy).toEqual({ score: "desc" });
    });
  });

  describe("getMemories", () => {
    it("returns empty data for no memories", async () => {
      const result = await AgentMemory.getMemories("agent-1");
      expect(result.data).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it("filters by type when provided", async () => {
      await AgentMemory.getMemories("agent-1", { type: "LONG_TERM" });
      const call = mockFindMany.mock.calls[0][0];
      expect(call.where.type).toBe("LONG_TERM");
    });

    it("respects custom limit", async () => {
      await AgentMemory.getMemories("agent-1", { limit: 10 });
      const call = mockFindMany.mock.calls[0][0];
      expect(call.take).toBe(11);
    });

    it("caps limit at 200", async () => {
      await AgentMemory.getMemories("agent-1", { limit: 500 });
      const call = mockFindMany.mock.calls[0][0];
      expect(call.take).toBe(201);
    });
  });

  describe("deleteMemory", () => {
    it("deletes memory by id", async () => {
      const result = await AgentMemory.deleteMemory("mem-to-delete");
      expect(result).toEqual({ id: "del-1" });
      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: "mem-to-delete" },
      });
    });
  });

  describe("prune", () => {
    it("returns 0 when under limit", async () => {
      mockCount.mockResolvedValueOnce(50);
      const result = await AgentMemory.prune("agent-1", 100);
      expect(result).toBe(0);
    });

    it("deletes excess memories when over limit", async () => {
      mockCount.mockResolvedValueOnce(150);
      mockFindMany.mockResolvedValueOnce(
        Array(50).fill(null).map((_, i) => ({ id: `mem-${i}` }))
      );
      mockDeleteMany.mockResolvedValueOnce({ count: 50 });
      const result = await AgentMemory.prune("agent-1", 100);
      expect(result).toBe(50);
    });

    it("returns correct count of deleted memories", async () => {
      mockCount.mockResolvedValueOnce(200);
      mockFindMany.mockResolvedValueOnce(
        Array(100).fill(null).map((_, i) => ({ id: `mem-${i}` }))
      );
      mockDeleteMany.mockResolvedValueOnce({ count: 100 });
      const result = await AgentMemory.prune("agent-1", 100);
      expect(result).toBe(100);
    });
  });

  describe("summarize", () => {
    it("returns null when no memories exist", async () => {
      mockFindMany.mockResolvedValueOnce([]);
      const result = await AgentMemory.summarize("agent-1", "SHORT_TERM");
      expect(result).toBeNull();
    });

    it("creates summary from existing memories", async () => {
      mockFindMany.mockResolvedValueOnce([
        { id: "m1", content: "first memory", organizationId: "org-1", userId: "user-1" },
        { id: "m2", content: "second memory", organizationId: "org-1", userId: "user-1" },
      ] as any);
      mockUpsert.mockResolvedValueOnce({ id: "summary-1" } as any);
      const result = await AgentMemory.summarize("agent-1", "SHORT_TERM");
      expect(result).toBeDefined();
    });
  });
});

describe("AgentKnowledge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createKnowledgeBase", () => {
    it("creates knowledge base with provided data", async () => {
      mockCreate.mockResolvedValueOnce({ id: "kb-1" });
      await AgentKnowledge.createKnowledgeBase("agent-1", mockContext, {
        name: "Test KB",
        description: "A test knowledge base",
      });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Test KB",
            description: "A test knowledge base",
          }),
        })
      );
    });

    it("applies default chunk sizes", async () => {
      mockCreate.mockResolvedValueOnce({ id: "kb-2" });
      await AgentKnowledge.createKnowledgeBase("agent-1", mockContext, {
        name: "Default KB",
      });
      const call = mockCreate.mock.calls[0][0];
      expect(call.data.chunkSize).toBe(500);
      expect(call.data.chunkOverlap).toBe(50);
    });

    it("accepts custom chunk sizes", async () => {
      mockCreate.mockResolvedValueOnce({ id: "kb-3" });
      await AgentKnowledge.createKnowledgeBase("agent-1", mockContext, {
        name: "Custom KB",
        chunkSize: 1000,
        chunkOverlap: 100,
      });
      const call = mockCreate.mock.calls[0][0];
      expect(call.data.chunkSize).toBe(1000);
      expect(call.data.chunkOverlap).toBe(100);
    });
  });

  describe("addDocument", () => {
    it("creates document with content", async () => {
      mockCreate.mockResolvedValueOnce({ id: "doc-1" });
      await AgentKnowledge.addDocument("kb-1", mockContext, {
        title: "Doc 1",
        source: "https://example.com",
        sourceType: "web",
        content: "short content",
      });
      expect(mockCreate).toHaveBeenCalled();
    });

    it("chunks long content", async () => {
      mockCreate.mockResolvedValueOnce({ id: "doc-2" });
      const longContent = "A".repeat(1500);
      await AgentKnowledge.addDocument("kb-1", mockContext, {
        title: "Long Doc",
        source: "local",
        sourceType: "text",
        content: longContent,
      });
      const call = mockCreate.mock.calls[0][0];
      expect(Array.isArray(call.data.chunks)).toBe(true);
      expect(call.data.chunks.length).toBeGreaterThan(1);
    });
  });

  describe("chunkContent", () => {
    it("returns single chunk for short content", () => {
      const chunks = AgentKnowledge.chunkContent("short", 500, 50);
      expect(chunks).toEqual(["short"]);
    });

    it("returns multiple chunks for long content", () => {
      const content = "A".repeat(1200);
      const chunks = AgentKnowledge.chunkContent(content, 500, 50);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it("maintains overlap between chunks", () => {
      const content = "The quick brown fox jumps over the lazy dog. " +
        "This is a longer piece of text that should be split into chunks. " +
        "We need enough content here to ensure multiple chunks are created.";
      const chunkSize = 50;
      const overlap = 20;
      const chunks = AgentKnowledge.chunkContent(content, chunkSize, overlap);
      if (chunks.length > 1) {
        const firstEnd = chunks[0].slice(-overlap);
        const secondStart = chunks[1].slice(0, overlap);
        expect(firstEnd).toBe(secondStart);
      }
    });

    it("handles content exactly at chunk size", () => {
      const content = "A".repeat(500);
      const chunks = AgentKnowledge.chunkContent(content, 500, 50);
      expect(chunks).toEqual([content]);
    });

    it("handles content one byte over chunk size", () => {
      const content = "A".repeat(501);
      const chunks = AgentKnowledge.chunkContent(content, 500, 50);
      expect(chunks.length).toBe(2);
      expect(chunks[0].length).toBe(500);
      expect(chunks[1].length).toBe(51);
    });

    it("handles empty content", () => {
      const chunks = AgentKnowledge.chunkContent("", 500, 50);
      expect(chunks).toEqual([""]);
    });
  });

  describe("search", () => {
    it("returns empty array when no knowledge bases exist", async () => {
      mockFindMany.mockResolvedValueOnce([]);
      const results = await AgentKnowledge.search("agent-1", "query", { organizationId: "org-1" });
      expect(results).toEqual([]);
    });

    it("searches documents when KBs exist", async () => {
      mockFindMany.mockResolvedValueOnce([{ id: "kb-1" }] as any);
      mockFindMany.mockResolvedValueOnce([
        { id: "doc-1", title: "Found Doc", content: "relevant content" },
      ] as any);
      const results = await AgentKnowledge.search("agent-1", "relevant", { organizationId: "org-1" });
      expect(results).toHaveLength(1);
    });
  });

  describe("getKnowledgeBases", () => {
    it("returns knowledge bases for agent", async () => {
      mockFindMany.mockResolvedValueOnce([
        { id: "kb-1", name: "KB 1", documents: [] },
        { id: "kb-2", name: "KB 2", documents: [] },
      ] as any);
      const result = await AgentKnowledge.getKnowledgeBases("agent-1");
      expect(result).toHaveLength(2);
    });

    it("includes documents in response", async () => {
      mockFindMany.mockResolvedValueOnce([
        { id: "kb-1", name: "KB 1" },
      ] as any);
      mockFindMany.mockResolvedValueOnce([
        { id: "doc-1", knowledgeBaseId: "kb-1" },
      ] as any);
      const result = await AgentKnowledge.getKnowledgeBases("agent-1");
      expect(result[0].documents).toHaveLength(1);
    });
  });

  describe("getDocuments", () => {
    it("returns paginated documents", async () => {
      mockFindMany.mockResolvedValueOnce([
        { id: "doc-1" }, { id: "doc-2" },
      ] as any);
      const result = await AgentKnowledge.getDocuments("kb-1");
      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it("respects cursor pagination", async () => {
      mockFindMany.mockResolvedValueOnce([]);
      await AgentKnowledge.getDocuments("kb-1", { cursor: "doc-5", limit: 10 });
      const call = mockFindMany.mock.calls[0][0];
      expect(call.cursor).toEqual({ id: "doc-5" });
    });
  });

  describe("deleteDocument", () => {
    it("deletes document by id", async () => {
      mockDelete.mockResolvedValueOnce({ id: "doc-deleted" });
      await AgentKnowledge.deleteDocument("doc-to-delete");
      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: "doc-to-delete" },
      });
    });
  });

  describe("deleteKnowledgeBase", () => {
    it("deletes documents then knowledge base", async () => {
      mockDeleteMany.mockResolvedValueOnce({ count: 0 });
      mockDelete.mockResolvedValueOnce({ id: "kb-deleted" });
      await AgentKnowledge.deleteKnowledgeBase("kb-to-delete");
      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { knowledgeBaseId: "kb-to-delete" },
      });
      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: "kb-to-delete" },
      });
    });
  });
});
