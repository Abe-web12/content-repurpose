import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aIAgentTool: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "tool-1" }),
      delete: vi.fn().mockResolvedValue({ id: "del-tool" }),
      update: vi.fn().mockResolvedValue({ id: "upd-tool" }),
    },
    aiAgentTools: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "tool-1" }),
      delete: vi.fn().mockResolvedValue({ id: "del-tool" }),
      update: vi.fn().mockResolvedValue({ id: "upd-tool" }),
    },
  },
}));

vi.mock("@/lib/workflows/engine", () => ({
  WorkflowEngine: {
    execute: vi.fn().mockResolvedValue({ id: "wf-run-1" }),
  },
}));

import { AgentTools } from "@/lib/agents/tools";

const mockContext = { organizationId: "org-1", userId: "user-1" };

describe("AgentTools", () => {
  beforeEach(() => {
    AgentTools.toolHandlers = {};
  });

  describe("register", () => {
    it("adds a handler", () => {
      const handler = vi.fn().mockResolvedValue("ok");
      AgentTools.register("custom_tool", handler);
      expect(AgentTools.toolHandlers["custom_tool"]).toBe(handler);
    });

    it("overwrites existing handler for same type", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      AgentTools.register("dup_tool", handler1);
      AgentTools.register("dup_tool", handler2);
      expect(AgentTools.toolHandlers["dup_tool"]).toBe(handler2);
    });
  });

  describe("execute", () => {
    it("calls registered handler", async () => {
      const handler = vi.fn().mockResolvedValue("handler_result");
      AgentTools.register("custom_tool", handler);
      const result = await AgentTools.execute("custom_tool", { foo: "bar" }, mockContext);
      expect(handler).toHaveBeenCalledWith({ foo: "bar" }, mockContext);
      expect(result).toBe("handler_result");
    });

    it("web_search returns results with query", async () => {
      const result = await AgentTools.execute("web_search", { query: "test query" }, mockContext) as any;
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.query).toBe("test query");
    });

    it("web_search throws on missing query", async () => {
      await expect(
        AgentTools.execute("web_search", {}, mockContext)
      ).rejects.toThrow("Query required for web search");
    });

    it("calculator evaluates expression", async () => {
      const result = await AgentTools.execute("calculator", { expression: "2 + 2" }, mockContext) as any;
      expect(result.result).toBe(4);
      expect(result.expression).toBe("2 + 2");
    });

    it("calculator handles complex expressions", async () => {
      const result = await AgentTools.execute("calculator", { expression: "(3 + 5) * 2" }, mockContext) as any;
      expect(result.result).toBe(16);
    });

    it("calculator throws on invalid expression", async () => {
      await expect(
        AgentTools.execute("calculator", { expression: "invalid///" }, mockContext)
      ).rejects.toThrow("Invalid expression");
    });

    it("calculator throws on missing expression", async () => {
      await expect(
        AgentTools.execute("calculator", {}, mockContext)
      ).rejects.toThrow("Expression required for calculator");
    });

    it("http_request returns response with URL", async () => {
      const result = await AgentTools.execute("http_request", { url: "https://example.com" }, mockContext) as any;
      expect(result.url).toBe("https://example.com");
      expect(result.status).toBe(200);
      expect(result.body).toContain("https://example.com");
    });

    it("http_request throws on missing URL", async () => {
      await expect(
        AgentTools.execute("http_request", {}, mockContext)
      ).rejects.toThrow("URL required for HTTP request");
    });

    it("current_time returns valid ISO time", async () => {
      const result = await AgentTools.execute("current_time", {}, mockContext) as any;
      expect(result.time).toBeDefined();
      expect(() => new Date(result.time)).not.toThrow();
      expect(new Date(result.time).toISOString()).toBe(result.time);
    });

    it("throws for unknown tool type", async () => {
      await expect(
        AgentTools.execute("nonexistent_tool", {}, mockContext)
      ).rejects.toThrow("Unknown tool type: nonexistent_tool");
    });

    it("workflow executes via WorkflowEngine", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { WorkflowEngine } = await import("@/lib/workflows/engine");
      await AgentTools.execute("workflow", { workflowId: "wf-1" }, mockContext);
      expect(WorkflowEngine.execute).toHaveBeenCalledWith(
        "wf-1",
        expect.objectContaining({
          organizationId: "org-1",
          userId: "user-1",
          triggerType: "agent",
        })
      );
    });

    it("workflow throws on missing workflowId", async () => {
      await expect(
        AgentTools.execute("workflow", {}, mockContext)
      ).rejects.toThrow("workflowId required");
    });
  });

  describe("getAgentTools", () => {
    it("returns tools for agent", async () => {
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.aiAgentTools.findMany).mockResolvedValueOnce([
        { id: "t1", type: "web_search", name: "Web Search", enabled: true },
      ] as any);
      const result = await AgentTools.getAgentTools("agent-1");
      expect(result).toHaveLength(1);
      expect(prisma.aiAgentTools.findMany).toHaveBeenCalledWith({
        where: { agentId: "agent-1", enabled: true },
      });
    });

    it("returns only enabled tools", async () => {
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.aiAgentTools.findMany).mockResolvedValueOnce([]);
      const result = await AgentTools.getAgentTools("agent-1");
      expect(result).toEqual([]);
    });
  });

  describe("addTool", () => {
    it("creates a new tool for agent", async () => {
      const { prisma } = await import("@/lib/prisma");
      const result = await AgentTools.addTool("agent-1", mockContext, {
        type: "web_search",
        name: "Search Tool",
        description: "Searches the web",
      });
      expect(result).toEqual({ id: "tool-1" });
      expect(prisma.aiAgentTools.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agentId: "agent-1",
            type: "web_search",
            name: "Search Tool",
          }),
        })
      );
    });
  });

  describe("removeTool", () => {
    it("removes tool by id", async () => {
      const { prisma } = await import("@/lib/prisma");
      const result = await AgentTools.removeTool("tool-to-remove");
      expect(result).toEqual({ id: "del-tool" });
      expect(prisma.aiAgentTools.delete).toHaveBeenCalledWith({
        where: { id: "tool-to-remove" },
      });
    });
  });

  describe("updateTool", () => {
    it("updates tool config", async () => {
      const { prisma } = await import("@/lib/prisma");
      await AgentTools.updateTool("tool-1", { config: { maxResults: 10 } });
      expect(prisma.aiAgentTools.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "tool-1" },
          data: expect.objectContaining({
            config: { maxResults: 10 },
          }),
        })
      );
    });

    it("updates tool enabled status", async () => {
      const { prisma } = await import("@/lib/prisma");
      await AgentTools.updateTool("tool-1", { enabled: false });
      expect(prisma.aiAgentTools.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "tool-1" },
          data: expect.objectContaining({
            enabled: false,
          }),
        })
      );
    });
  });
});
