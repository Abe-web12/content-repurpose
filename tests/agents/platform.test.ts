import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, string>();

vi.mock("@/lib/ai/provider", () => ({
  generateEmbedding: vi.fn().mockRejectedValue(new Error("No API key (mocked)")),
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) || null)),
    set: vi.fn((key: string, value: string, ..._args: unknown[]) => {
      store.set(key, value);
      return Promise.resolve("OK");
    }),
    incr: vi.fn(() => Promise.resolve(1)),
    expire: vi.fn(() => Promise.resolve(1)),
    lpush: vi.fn((_key: string, value: string) => {
      store.set(`mock:list:${Date.now()}`, value);
      return Promise.resolve(1);
    }),
    rpop: vi.fn(() => Promise.resolve(null)),
    keys: vi.fn((pattern: string) => {
      const prefix = pattern.replace("*", "");
      return Promise.resolve(Array.from(store.keys()).filter((k) => k.startsWith(prefix)));
    }),
    del: vi.fn((key: string) => {
      store.delete(key);
      return Promise.resolve(1);
    }),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiAgentMemories: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      update: vi.fn().mockResolvedValue({}),
    },
    aiAgents: {
      findUnique: vi.fn().mockResolvedValue({ id: "agent-1", name: "Test Agent" }),
    },
    aiAgentRuns: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({ id: "run-1" }),
    },
  },
}));

import { createAgentSchema, updateAgentSchema, chatSchema, memorySchema, toolSchema, scheduleSchema, taskSchema, runSchema } from "@/lib/validations/agents";
import { AgentOrchestrator } from "@/lib/agents/orchestrator";
import { BackgroundExecutor } from "@/lib/agents/background";
import { ToolExecutor } from "@/lib/agents/tool-executor";
import { MemoryEnhancer } from "@/lib/agents/memory-enhancer";
import { Sandbox } from "@/lib/agents/sandbox";

beforeEach(() => {
  store.clear();
});

describe("Agent Platform - Validations", () => {
  describe("Agent CRUD", () => {
    it("validates create agent schema", () => {
      const valid = createAgentSchema.safeParse({
        name: "Test Agent",
        model: "gpt-4",
        provider: "openai",
        temperature: 0.7,
        maxTokens: 2048,
      });
      expect(valid.success).toBe(true);
    });

    it("rejects create agent without required fields", () => {
      const result = createAgentSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });

    it("validates update agent schema", () => {
      const result = updateAgentSchema.safeParse({ name: "Updated Agent", status: "ACTIVE" });
      expect(result.success).toBe(true);
    });
  });

  describe("Chat & Memory", () => {
    it("validates chat schema", () => {
      const result = chatSchema.safeParse({ message: "Hello" });
      expect(result.success).toBe(true);
    });

    it("validates memory schema", () => {
      const result = memorySchema.safeParse({ key: "test", content: "test content", type: "SHORT_TERM" });
      expect(result.success).toBe(true);
    });
  });

  describe("Tools & Tasks", () => {
    it("validates tool schema", () => {
      const result = toolSchema.safeParse({ type: "WEB_SEARCH", name: "Search" });
      expect(result.success).toBe(true);
    });

    it("validates task schema", () => {
      const result = taskSchema.safeParse({ title: "Test task", priority: 1 });
      expect(result.success).toBe(true);
    });

    it("validates schedule schema", () => {
      const result = scheduleSchema.safeParse({ cron: "0 0 * * *" });
      expect(result.success).toBe(true);
    });

    it("validates run schema", () => {
      const result = runSchema.safeParse({ input: { text: "hello" } });
      expect(result.success).toBe(true);
    });
  });
});

describe("Agent Platform - Orchestrator", () => {
  describe("createCollaboration", () => {
    it("creates a collaboration plan", async () => {
      const plan = await AgentOrchestrator.createCollaboration(
        "agent-1",
        "Write a blog post",
        "Topic: AI",
        [
          { agentId: "agent-2", role: "researcher", instructions: "Find sources" },
          { agentId: "agent-3", role: "reviewer", instructions: "Review output" },
        ]
      );
      expect(plan.mainAgentId).toBe("agent-1");
      expect(plan.collaborators).toHaveLength(2);
      expect(plan.status).toBe("pending");
      expect(plan.task).toBe("Write a blog post");
    });
  });
});

describe("Agent Platform - Background Executor", () => {
  describe("enqueue", () => {
    it("creates a background job", async () => {
      const job = await BackgroundExecutor.enqueue("agent-1", { task: "test" });
      expect(job.id).toBeDefined();
      expect(job.agentId).toBe("agent-1");
      expect(job.status).toBe("queued");
      expect(job.progress).toBe(0);
    });
  });

  describe("updateProgress", () => {
    it("updates job progress", async () => {
      const job = await BackgroundExecutor.enqueue("agent-1", {});
      store.set(`agent:background:job:${job.id}`, JSON.stringify(job));
      await BackgroundExecutor.updateProgress(job.id, 50, "Halfway");
      const updated = await BackgroundExecutor.getJob(job.id);
      expect(updated?.progress).toBe(50);
      expect(updated?.progressMessage).toBe("Halfway");
    });
  });

  describe("cancel", () => {
    it("cancels a queued job", async () => {
      const job = await BackgroundExecutor.enqueue("agent-1", {});
      store.set(`agent:background:job:${job.id}`, JSON.stringify(job));
      await BackgroundExecutor.cancel(job.id);
      const updated = await BackgroundExecutor.getJob(job.id);
      expect(updated?.status).toBe("cancelled");
    });
  });

  describe("listJobs", () => {
    it("lists jobs for an agent", async () => {
      const job = await BackgroundExecutor.enqueue("agent-1", {});
      store.set(`agent:background:job:${job.id}`, JSON.stringify(job));
      const jobs = await BackgroundExecutor.listJobs("agent-1");
      expect(Array.isArray(jobs)).toBe(true);
    });
  });
});

describe("Agent Platform - Tool Executor", () => {
  describe("executeAndLog", () => {
    it("executes web search tool", async () => {
      const result = await ToolExecutor.executeAndLog("agent-1", "WEB_SEARCH" as any, "Search", { query: "AI" });
      expect(result.success).toBe(true);
      expect(result.output).toContain("Web Search");
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("executes calculator tool", async () => {
      const result = await ToolExecutor.executeAndLog("agent-1", "CALCULATOR" as any, "Calc", { expression: "2+2" });
      expect(result.success).toBe(true);
      expect(result.output).toContain("Calculator");
    });

    it("executes workflow tool", async () => {
      const result = await ToolExecutor.executeAndLog("agent-1", "WORKFLOW" as any, "WF", { workflowId: "123" });
      expect(result.success).toBe(true);
      expect(result.output).toContain("Workflow");
    });

    it("executes all tool types without error", async () => {
      const toolTypes = ["WEB_SEARCH", "CALCULATOR", "HTTP_REQUEST", "WORKFLOW", "EMAIL", "DATABASE", "WEBHOOK"] as const;
      for (const type of toolTypes) {
        const result = await ToolExecutor.executeAndLog("agent-1", type as any, type, {});
        expect(result.success).toBe(true);
      }
    });
  });
});

describe("Agent Platform - Memory Enhancer", () => {
  describe("enforceMemoryLimits", () => {
    it("runs without error", async () => {
      await expect(MemoryEnhancer.enforceMemoryLimits("agent-1")).resolves.not.toThrow();
    });
  });

  describe("expireMemories", () => {
    it("returns count of expired memories", async () => {
      const count = await MemoryEnhancer.expireMemories();
      expect(typeof count).toBe("number");
      expect(count).toBe(0);
    });
  });

  describe("semanticSearch", () => {
    it("returns empty array for no matches", async () => {
      const results = await MemoryEnhancer.semanticSearch("agent-1", "test", 10);
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });
  });

  describe("getWorkingContext", () => {
    it("returns empty string when no memories", async () => {
      const ctx = await MemoryEnhancer.getWorkingContext("agent-1");
      expect(typeof ctx).toBe("string");
    });
  });

  describe("mergeMemories", () => {
    it("runs without error with no memories", async () => {
      await expect(MemoryEnhancer.mergeMemories("agent-1")).resolves.not.toThrow();
    });
  });
});

describe("Agent Platform - Sandbox", () => {
  describe("validateToolAccess", () => {
    it("allows configured tools", () => {
      const sandbox = new Sandbox({ allowedTools: ["WEB_SEARCH", "CALCULATOR"] });
      expect(sandbox.validateToolAccess("WEB_SEARCH")).toBe(true);
      expect(sandbox.validateToolAccess("CALCULATOR")).toBe(true);
    });

    it("denies unconfigured tools", () => {
      const sandbox = new Sandbox({ allowedTools: ["WEB_SEARCH"] });
      expect(sandbox.validateToolAccess("HTTP_REQUEST")).toBe(false);
    });
  });

  describe("validateOutput", () => {
    it("validates short output", () => {
      const sandbox = new Sandbox({ maxOutputLength: 100 });
      expect(sandbox.validateOutput("short").valid).toBe(true);
    });

    it("rejects long output", () => {
      const sandbox = new Sandbox({ maxOutputLength: 5 });
      expect(sandbox.validateOutput("too long output").valid).toBe(false);
    });
  });

  describe("sanitizeInput", () => {
    it("removes script tags from strings", () => {
      const sandbox = new Sandbox();
      const result = sandbox.sanitizeInput({ text: "hello <script>alert('xss')</script> world" });
      expect(result.text).toBe("hello  world");
    });

    it("leaves non-strings unchanged", () => {
      const sandbox = new Sandbox();
      const result = sandbox.sanitizeInput({ number: 42, bool: true });
      expect(result.number).toBe(42);
      expect(result.bool).toBe(true);
    });
  });

  describe("wrapExecution", () => {
    it("resolves successful executions", async () => {
      const sandbox = new Sandbox();
      const result = await sandbox.wrapExecution(async () => "success");
      expect(result).toBe("success");
    });

    it("rejects on timeout", async () => {
      const sandbox = new Sandbox({ maxExecutionTime: 10 });
      await expect(
        sandbox.wrapExecution(async () => {
          await new Promise((r) => setTimeout(r, 100));
          return "too late";
        })
      ).rejects.toThrow("timeout");
    }, 5000);
  });
});

describe("Agent Platform - Memory Enhancer Advanced", () => {
  describe("autoSummarize", () => {
    it("returns null when insufficient memories", async () => {
      const result = await MemoryEnhancer.autoSummarize("non-existent-agent");
      expect(result).toBeNull();
    });
  });

  describe("enforceMemoryLimits", () => {
    it("does not throw", async () => {
      await expect(MemoryEnhancer.enforceMemoryLimits("test-agent")).resolves.not.toThrow();
    });
  });

  describe("semanticSearch edge cases", () => {
    it("returns empty array for no matches", async () => {
      const results = await MemoryEnhancer.semanticSearch("non-existent", "zzzznotfound", 5);
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });
  });
});
