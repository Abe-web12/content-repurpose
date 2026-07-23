import { describe, it, expect } from "vitest";
import {
  createAgentSchema,
  updateAgentSchema,
  chatSchema,
  memorySchema,
  knowledgeBaseSchema,
  documentSchema,
  toolSchema,
  scheduleSchema,
  taskSchema,
} from "@/lib/validations/agents";

describe("createAgentSchema", () => {
  it("accepts valid input", () => {
    const result = createAgentSchema.safeParse({ name: "My Agent" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createAgentSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("applies defaults for model and provider", () => {
    const result = createAgentSchema.safeParse({ name: "Test" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.model).toBe("gpt-4");
      expect(result.data.provider).toBe("openai");
    }
  });

  it("applies default temperature and maxTokens", () => {
    const result = createAgentSchema.safeParse({ name: "Test" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.temperature).toBe(0.7);
      expect(result.data.maxTokens).toBe(4096);
    }
  });

  it("accepts optional description", () => {
    const result = createAgentSchema.safeParse({ name: "Agent", description: "A helpful agent" });
    expect(result.success).toBe(true);
  });

  it("accepts optional systemPrompt", () => {
    const result = createAgentSchema.safeParse({ name: "Agent", systemPrompt: "You are helpful" });
    expect(result.success).toBe(true);
  });

  it("rejects name over 128 chars", () => {
    const result = createAgentSchema.safeParse({ name: "x".repeat(129) });
    expect(result.success).toBe(false);
  });

  it("accepts valid visibility values", () => {
    const result1 = createAgentSchema.safeParse({ name: "Test", visibility: "PRIVATE" });
    expect(result1.success).toBe(true);
    const result2 = createAgentSchema.safeParse({ name: "Test", visibility: "ORGANIZATION" });
    expect(result2.success).toBe(true);
    const result3 = createAgentSchema.safeParse({ name: "Test", visibility: "PUBLIC" });
    expect(result3.success).toBe(true);
  });

  it("rejects invalid visibility", () => {
    const result = createAgentSchema.safeParse({ name: "Test", visibility: "INVALID" });
    expect(result.success).toBe(false);
  });

  it("accepts custom model and provider", () => {
    const result = createAgentSchema.safeParse({
      name: "Agent",
      model: "claude-3",
      provider: "anthropic",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.model).toBe("claude-3");
      expect(result.data.provider).toBe("anthropic");
    }
  });
});

describe("updateAgentSchema", () => {
  it("accepts partial update", () => {
    const result = updateAgentSchema.safeParse({ name: "Updated Agent" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = updateAgentSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const result = updateAgentSchema.safeParse({
      name: "Updated",
      description: "New description",
      systemPrompt: "New prompt",
      model: "gpt-4o",
      provider: "openai",
      temperature: 0.5,
      maxTokens: 2048,
      visibility: "PUBLIC",
      status: "ACTIVE",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = updateAgentSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("accepts status values", () => {
    const statuses = ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED", "ERROR"];
    for (const status of statuses) {
      const result = updateAgentSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    const result = updateAgentSchema.safeParse({ status: "INVALID" });
    expect(result.success).toBe(false);
  });
});

describe("chatSchema", () => {
  it("accepts valid message", () => {
    const result = chatSchema.safeParse({ message: "Hello" });
    expect(result.success).toBe(true);
  });

  it("rejects empty message", () => {
    const result = chatSchema.safeParse({ message: "" });
    expect(result.success).toBe(false);
  });

  it("accepts optional conversationId", () => {
    const result = chatSchema.safeParse({ message: "Hello", conversationId: "conv-1" });
    expect(result.success).toBe(true);
  });

  it("rejects missing message field", () => {
    const result = chatSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("memorySchema", () => {
  it("accepts valid input", () => {
    const result = memorySchema.safeParse({ key: "mem-key", content: "memory content" });
    expect(result.success).toBe(true);
  });

  it("rejects empty key", () => {
    const result = memorySchema.safeParse({ key: "", content: "content" });
    expect(result.success).toBe(false);
  });

  it("rejects empty content", () => {
    const result = memorySchema.safeParse({ key: "key", content: "" });
    expect(result.success).toBe(false);
  });

  it("applies defaults for type and score", () => {
    const result = memorySchema.safeParse({ key: "k", content: "c" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("SHORT_TERM");
      expect(result.data.score).toBe(0);
    }
  });

  it("accepts custom type and score", () => {
    const result = memorySchema.safeParse({ key: "k", content: "c", type: "LONG_TERM", score: 5 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("LONG_TERM");
      expect(result.data.score).toBe(5);
    }
  });

  it("accepts optional summary", () => {
    const result = memorySchema.safeParse({ key: "k", content: "c", summary: "summary text" });
    expect(result.success).toBe(true);
  });
});

describe("knowledgeBaseSchema", () => {
  it("accepts valid input", () => {
    const result = knowledgeBaseSchema.safeParse({ name: "Knowledge Base" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = knowledgeBaseSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name over 128 chars", () => {
    const result = knowledgeBaseSchema.safeParse({ name: "x".repeat(129) });
    expect(result.success).toBe(false);
  });

  it("applies defaults for chunkSize and chunkOverlap", () => {
    const result = knowledgeBaseSchema.safeParse({ name: "KB" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.chunkSize).toBe(500);
      expect(result.data.chunkOverlap).toBe(50);
    }
  });

  it("accepts custom chunk settings", () => {
    const result = knowledgeBaseSchema.safeParse({ name: "KB", chunkSize: 1000, chunkOverlap: 200 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.chunkSize).toBe(1000);
      expect(result.data.chunkOverlap).toBe(200);
    }
  });
});

describe("documentSchema", () => {
  it("accepts valid input", () => {
    const result = documentSchema.safeParse({
      title: "Doc",
      source: "https://example.com",
      sourceType: "web",
      content: "document content",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = documentSchema.safeParse({
      title: "",
      source: "src",
      sourceType: "web",
      content: "content",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty source", () => {
    const result = documentSchema.safeParse({
      title: "Doc",
      source: "",
      sourceType: "web",
      content: "content",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty sourceType", () => {
    const result = documentSchema.safeParse({
      title: "Doc",
      source: "src",
      sourceType: "",
      content: "content",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty content", () => {
    const result = documentSchema.safeParse({
      title: "Doc",
      source: "src",
      sourceType: "web",
      content: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("toolSchema", () => {
  it("accepts valid input", () => {
    const result = toolSchema.safeParse({ type: "web_search", name: "Search" });
    expect(result.success).toBe(true);
  });

  it("rejects empty type", () => {
    const result = toolSchema.safeParse({ type: "", name: "Search" });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = toolSchema.safeParse({ type: "web_search", name: "" });
    expect(result.success).toBe(false);
  });

  it("accepts optional config", () => {
    const result = toolSchema.safeParse({
      type: "web_search",
      name: "Search",
      config: { apiKey: "test" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional description", () => {
    const result = toolSchema.safeParse({
      type: "web_search",
      name: "Search",
      description: "Searches the web",
    });
    expect(result.success).toBe(true);
  });
});

describe("scheduleSchema", () => {
  it("accepts valid input", () => {
    const result = scheduleSchema.safeParse({ cron: "0 * * * *" });
    expect(result.success).toBe(true);
  });

  it("rejects empty cron", () => {
    const result = scheduleSchema.safeParse({ cron: "" });
    expect(result.success).toBe(false);
  });

  it("accepts optional input", () => {
    const result = scheduleSchema.safeParse({ cron: "0 * * * *", input: { topic: "AI" } });
    expect(result.success).toBe(true);
  });
});

describe("taskSchema", () => {
  it("accepts valid input", () => {
    const result = taskSchema.safeParse({ title: "My Task" });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = taskSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("applies default priority", () => {
    const result = taskSchema.safeParse({ title: "Task" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe(0);
    }
  });

  it("accepts custom priority", () => {
    const result = taskSchema.safeParse({ title: "Task", priority: 5 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe(5);
    }
  });

  it("accepts optional description", () => {
    const result = taskSchema.safeParse({ title: "Task", description: "Description here" });
    expect(result.success).toBe(true);
  });
});
