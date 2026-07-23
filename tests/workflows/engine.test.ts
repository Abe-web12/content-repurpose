import { describe, it, expect, vi } from "vitest";
import { WorkflowCompiler } from "@/lib/workflows/compiler";
import { WorkflowValidator } from "@/lib/workflows/validator";
import { WorkflowRetry } from "@/lib/workflows/retry";
import { WorkflowScheduler } from "@/lib/workflows/scheduler";
import { WorkflowVariables } from "@/lib/workflows/variables";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workflowExecutionLog: {
      create: vi.fn().mockResolvedValue({ id: "log-1" }),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    workflowExecutionLogs: {
      create: vi.fn().mockResolvedValue({ id: "log-1" }),
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

import { WorkflowLogs } from "@/lib/workflows/logs";

describe("WorkflowCompiler", () => {
  it("compiles nodes and edges into a workflow", () => {
    const nodes = [
      { id: "t1", type: "TRIGGER", label: "Start", config: {}, positionX: 0, positionY: 0 },
      { id: "n1", type: "AI_GENERATE", label: "Generate", config: {}, positionX: 200, positionY: 0 },
    ];
    const edges = [{ id: "e1", sourceNodeId: "t1", targetNodeId: "n1" }];
    const compiled = WorkflowCompiler.compile(nodes, edges);
    expect(compiled.entryNode).toBe("t1");
    expect(compiled.nodes.size).toBe(2);
    expect(compiled.executionOrder.length).toBe(2);
  });

  it("identifies the trigger node as entry point", () => {
    const nodes = [
      { id: "n1", type: "AI_GENERATE", label: "Gen", config: {}, positionX: 0, positionY: 0 },
      { id: "t1", type: "TRIGGER", label: "Start", config: {}, positionX: 0, positionY: 100 },
    ];
    const compiled = WorkflowCompiler.compile(nodes, []);
    expect(compiled.entryNode).toBe("t1");
  });

  it("falls back to first node if no trigger exists", () => {
    const nodes = [
      { id: "n1", type: "AI_GENERATE", label: "Gen", config: {}, positionX: 0, positionY: 0 },
      { id: "n2", type: "AI_REWRITE", label: "Rewrite", config: {}, positionX: 200, positionY: 0 },
    ];
    const compiled = WorkflowCompiler.compile(nodes, []);
    expect(compiled.entryNode).toBe("n1");
  });

  it("builds correct adjacency map", () => {
    const nodes = [
      { id: "a", type: "TRIGGER", label: "A", config: {}, positionX: 0, positionY: 0 },
      { id: "b", type: "AI_GENERATE", label: "B", config: {}, positionX: 200, positionY: 0 },
      { id: "c", type: "AI_REWRITE", label: "C", config: {}, positionX: 400, positionY: 0 },
    ];
    const edges = [
      { id: "e1", sourceNodeId: "a", targetNodeId: "b" },
      { id: "e2", sourceNodeId: "b", targetNodeId: "c" },
    ];
    const compiled = WorkflowCompiler.compile(nodes, edges);
    expect(compiled.adjacency.get("a")).toHaveLength(1);
    expect(compiled.adjacency.get("b")).toHaveLength(1);
    expect(compiled.adjacency.get("c")).toHaveLength(0);
  });

  it("detects cycles in topological sort", () => {
    const nodes = [
      { id: "a", type: "TRIGGER", label: "A", config: {}, positionX: 0, positionY: 0 },
      { id: "b", type: "AI_GENERATE", label: "B", config: {}, positionX: 200, positionY: 0 },
    ];
    const edges = [
      { id: "e1", sourceNodeId: "a", targetNodeId: "b" },
      { id: "e2", sourceNodeId: "b", targetNodeId: "a" },
    ];
    const compiled = WorkflowCompiler.compile(nodes, edges);
    expect(compiled.executionOrder).toEqual([]);
  });

  it("groups parallel nodes", () => {
    const nodes = [
      { id: "a", type: "TRIGGER", label: "A", config: {}, positionX: 0, positionY: 0 },
      { id: "b", type: "AI_GENERATE", label: "B", config: {}, positionX: 200, positionY: 0 },
      { id: "c", type: "AI_REWRITE", label: "C", config: {}, positionX: 200, positionY: 100 },
    ];
    const edges = [
      { id: "e1", sourceNodeId: "a", targetNodeId: "b" },
      { id: "e2", sourceNodeId: "a", targetNodeId: "c" },
    ];
    const compiled = WorkflowCompiler.compile(nodes, edges);
    const groups = WorkflowCompiler.getParallelGroups(compiled.adjacency, compiled.executionOrder);
    expect(groups.length).toBeGreaterThanOrEqual(2);
  });
});

describe("WorkflowValidator", () => {
  it("passes valid workflow", () => {
    const nodes = [
      { id: "t1", type: "TRIGGER", label: "Start", config: {}, positionX: 0, positionY: 0 },
      { id: "n1", type: "AI_GENERATE", label: "Gen", config: { format: "blog" }, positionX: 200, positionY: 0 },
    ];
    const edges = [{ id: "e1", sourceNodeId: "t1", targetNodeId: "n1" }];
    const result = WorkflowValidator.validate(nodes, edges);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects empty workflow", () => {
    const result = WorkflowValidator.validate([], []);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Workflow must have at least one node");
  });

  it("reports edges with non-existent source nodes", () => {
    const nodes = [{ id: "n1", type: "AI_GENERATE", label: "N1", config: {}, positionX: 0, positionY: 0 }];
    const edges = [{ id: "e1", sourceNodeId: "missing", targetNodeId: "n1" }];
    const result = WorkflowValidator.validate(nodes, edges);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Edge references non-existent source node: missing");
  });

  it("reports edges with non-existent target nodes", () => {
    const nodes = [{ id: "n1", type: "AI_GENERATE", label: "N1", config: {}, positionX: 0, positionY: 0 }];
    const edges = [{ id: "e1", sourceNodeId: "n1", targetNodeId: "missing" }];
    const result = WorkflowValidator.validate(nodes, edges);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Edge references non-existent target node: missing");
  });

  it("warns about missing trigger node", () => {
    const nodes = [
      { id: "n1", type: "AI_GENERATE", label: "Gen", config: {}, positionX: 0, positionY: 0 },
      { id: "n2", type: "AI_REWRITE", label: "Rewrite", config: {}, positionX: 200, positionY: 0 },
    ];
    const edges = [{ id: "e1", sourceNodeId: "n1", targetNodeId: "n2" }];
    const result = WorkflowValidator.validate(nodes, edges);
    expect(result.warnings).toContain("No trigger node found");
  });

  it("validates AI_GENERATE node config", () => {
    const result1 = WorkflowValidator.validateNodeConfig({
      id: "n1", type: "AI_GENERATE", label: "Gen", config: {}, positionX: 0, positionY: 0,
    });
    expect(result1).toBe("AI node requires a format");

    const result2 = WorkflowValidator.validateNodeConfig({
      id: "n1", type: "AI_GENERATE", label: "Gen", config: { format: "blog" }, positionX: 0, positionY: 0,
    });
    expect(result2).toBeNull();
  });

  it("validates CONDITION node config", () => {
    const result = WorkflowValidator.validateNodeConfig({
      id: "c1", type: "CONDITION", label: "C", config: {}, positionX: 0, positionY: 0,
    });
    expect(result).toBe("Condition node requires field and operator");
  });

  it("validates EMAIL node config", () => {
    const result = WorkflowValidator.validateNodeConfig({
      id: "e1", type: "EMAIL", label: "Email", config: {}, positionX: 0, positionY: 0,
    });
    expect(result).toBe("Email node requires recipient");
  });
});

describe("WorkflowRetry", () => {
  it("succeeds on first attempt", async () => {
    const result = await WorkflowRetry.withRetry(
      async () => "success",
      { maxRetries: 2, initialDelay: 0 },
    );
    expect(result).toBe("success");
  });

  it("retries on failure and succeeds", async () => {
    let attempts = 0;
    const result = await WorkflowRetry.withRetry(
      async () => { attempts++; if (attempts < 2) throw new Error("fail"); return "ok"; },
      { maxRetries: 2, initialDelay: 0 },
    );
    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });

  it("fails after exhausting retries", async () => {
    await expect(
      WorkflowRetry.withRetry(
        async () => { throw new Error("persistent"); },
        { maxRetries: 2, initialDelay: 0 },
      ),
    ).rejects.toThrow("persistent");
  });

  it("calls onRetry callback on each retry", async () => {
    let retryCallCount = 0;
    await expect(
      WorkflowRetry.withRetry(
        async () => { throw new Error("fail"); },
        { maxRetries: 2, initialDelay: 0 },
        () => { retryCallCount++; },
      ),
    ).rejects.toThrow();
    expect(retryCallCount).toBe(2);
  });

  it("detects retryable errors", () => {
    expect(WorkflowRetry.isRetryable(new Error("rate limit exceeded"))).toBe(true);
    expect(WorkflowRetry.isRetryable(new Error("429 Too Many Requests"))).toBe(true);
    expect(WorkflowRetry.isRetryable(new Error("timeout"))).toBe(true);
    expect(WorkflowRetry.isRetryable(new Error("503 Service Unavailable"))).toBe(true);
    expect(WorkflowRetry.isRetryable(new Error("bad request"))).toBe(false);
  });

  it("calculates backoff with jitter", () => {
    const backoff = WorkflowRetry.calculateBackoff(1, 1000);
    expect(backoff).toBeGreaterThanOrEqual(2000);
    expect(backoff).toBeLessThanOrEqual(60000);
  });
});

describe("WorkflowScheduler", () => {
  it("matches cron expressions", () => {
    expect(WorkflowScheduler.cronMatch("* * * * *")).toBe(true);
    expect(WorkflowScheduler.cronMatch("0 * * * *")).toBe(false);
  });

  it("evaluates schedule config", () => {
    expect(WorkflowScheduler.evaluateSchedule({ cron: "* * * * *" })).toBe(true);
    expect(WorkflowScheduler.evaluateSchedule({})).toBe(false);
  });

  it("returns null for invalid cron", () => {
    expect(WorkflowScheduler.getNextScheduledRun("invalid")).toBeNull();
  });

  it("calculates next run time for hourly cron", () => {
    const next = WorkflowScheduler.getNextScheduledRun("0 * * * *");
    expect(next).toBeInstanceOf(Date);
    if (next) {
      expect(next.getMinutes()).toBe(0);
      expect(next.getSeconds()).toBe(0);
    }
  });
});

describe("WorkflowVariables", () => {
  it("interpolates template strings", () => {
    const result = WorkflowVariables.interpolate("Hello {{name}}", { name: "World" });
    expect(result).toBe("Hello World");
  });

  it("leaves unmatched placeholders empty", () => {
    const result = WorkflowVariables.interpolate("Hello {{missing}}", {});
    expect(result).toBe("Hello ");
  });

  it("extracts variable references", () => {
    const refs = WorkflowVariables.extractVariableRefs("{{a}} and {{b}} and {{a}}");
    expect(refs).toEqual(["a", "b"]);
  });

  it("handles JSON values in interpolation", () => {
    const result = WorkflowVariables.interpolate("Data: {{obj}}", { obj: { key: "val" } });
    expect(result).toBe('Data: {"key":"val"}');
  });

  it("returns empty array for string with no references", () => {
    expect(WorkflowVariables.extractVariableRefs("plain text")).toEqual([]);
  });
});

describe("WorkflowLogs", () => {
  it("log method does not throw", async () => {
    await expect(
      WorkflowLogs.log("test-wf", "test message", { level: "info" }),
    ).resolves.not.toThrow();
  });

  it("getLogs returns empty array for non-existent workflow", async () => {
    const result = await WorkflowLogs.getLogs("nonexistent");
    expect(result.data).toEqual([]);
  });

  it("getRunLogs returns empty array for non-existent run", async () => {
    const logs = await WorkflowLogs.getRunLogs("nonexistent");
    expect(logs).toEqual([]);
  });
});
