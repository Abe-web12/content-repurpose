import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeRetryDelay, classifyError, DEFAULT_RETRY_POLICY } from "@/lib/execution/types";
import { ExecutionContext } from "@/lib/execution/context";
import { evaluateCondition, executeDelay, executeVariable } from "@/lib/execution/nodes/utility-executor";

vi.mock("@/lib/redis", () => ({
  redis: {
    set: vi.fn().mockResolvedValue("OK"),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    zadd: vi.fn().mockResolvedValue(1),
    zrem: vi.fn().mockResolvedValue(1),
    zpopmin: vi.fn().mockResolvedValue([]),
    zrange: vi.fn().mockResolvedValue([]),
    zrangebyscore: vi.fn().mockResolvedValue([]),
    zcard: vi.fn().mockResolvedValue(0),
    hincrby: vi.fn().mockResolvedValue(1),
    hgetall: vi.fn().mockResolvedValue({}),
    lpush: vi.fn().mockResolvedValue(1),
    lrange: vi.fn().mockResolvedValue([]),
    ltrim: vi.fn().mockResolvedValue("OK"),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(-1),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workflow: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    workflowNode: {
      findMany: vi.fn(),
    },
    workflowEdge: {
      findMany: vi.fn(),
    },
    workflowVariable: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    workflowRun: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    workflowRunStep: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    workflowExecutionLog: {
      create: vi.fn(),
    },
  },
}));

describe("Retry Policy", () => {
  it("exponential backoff doubles each attempt", () => {
    expect(computeRetryDelay(DEFAULT_RETRY_POLICY, 0)).toBe(1000);
    expect(computeRetryDelay(DEFAULT_RETRY_POLICY, 1)).toBe(2000);
    expect(computeRetryDelay(DEFAULT_RETRY_POLICY, 2)).toBe(4000);
  });

  it("linear backoff increases by delay each attempt", () => {
    const policy = { ...DEFAULT_RETRY_POLICY, strategy: "linear" as const };
    expect(computeRetryDelay(policy, 0)).toBe(1000);
    expect(computeRetryDelay(policy, 1)).toBe(2000);
    expect(computeRetryDelay(policy, 2)).toBe(3000);
  });

  it("fixed backoff returns same delay", () => {
    const policy = { ...DEFAULT_RETRY_POLICY, strategy: "fixed" as const };
    expect(computeRetryDelay(policy, 0)).toBe(1000);
    expect(computeRetryDelay(policy, 5)).toBe(1000);
  });

  it("respects maxDelayMs", () => {
    const policy = { ...DEFAULT_RETRY_POLICY, maxDelayMs: 5000 };
    expect(computeRetryDelay(policy, 10)).toBe(5000);
  });
});

describe("Error Classification", () => {
  it("classifies timeout errors", () => {
    const err = classifyError(new Error("Operation timed out"));
    expect(err.retryable).toBe(true);
    expect(err.code).toBe("TIMEOUT_ERROR");
  });

  it("classifies API errors", () => {
    const err = classifyError(new Error("API error 500"));
    expect(err.retryable).toBe(true);
    expect(err.code).toBe("EXTERNAL_API_ERROR");
  });

  it("classifies permission errors", () => {
    const err = classifyError(new Error("Unauthorized"));
    expect(err.retryable).toBe(false);
    expect(err.code).toBe("PERMISSION_ERROR");
  });

  it("classifies validation errors", () => {
    const err = classifyError(new Error("Invalid input"));
    expect(err.retryable).toBe(false);
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("defaults to retryable for unknown errors", () => {
    const err = classifyError(new Error("Something went wrong"));
    expect(err.retryable).toBe(true);
  });
});

describe("ExecutionContext", () => {
  it("resolves trigger variables", () => {
    const ctx = new ExecutionContext({
      variables: {},
      triggerData: { source: "webhook", text: "hello" },
      userId: "user-1",
      organizationId: "org-1",
      workflowId: "wf-1",
      runId: "run-1",
    });
    expect(ctx.resolveTemplate('{{trigger.source}}')).toBe("webhook");
    expect(ctx.resolveTemplate('{{trigger.text}}')).toBe("hello");
  });

  it("resolves template variables", () => {
    const ctx = new ExecutionContext({
      variables: { name: "World", count: 42 },
      triggerData: {},
      userId: "user-1",
      organizationId: "org-1",
      workflowId: "wf-1",
      runId: "run-1",
    });
    expect(ctx.resolveTemplate('Hello {{variable.name}}')).toBe("Hello World");
    expect(ctx.resolveTemplate('{{variables.count}}')).toBe("42");
  });

  it("resolves node outputs", () => {
    const ctx = new ExecutionContext({
      variables: {},
      triggerData: {},
      userId: "user-1",
      organizationId: "org-1",
      workflowId: "wf-1",
      runId: "run-1",
    });
    ctx.setNodeOutput("node-1", { content: "Generated text" });
    expect(ctx.resolveTemplate('{{output.node-1.content}}')).toBe("Generated text");
  });

  it("preserves unresolved templates", () => {
    const ctx = new ExecutionContext({
      variables: {},
      triggerData: {},
      userId: "user-1",
      organizationId: "org-1",
      workflowId: "wf-1",
      runId: "run-1",
    });
    expect(ctx.resolveTemplate('{{unknown.var}}')).toBe("{{unknown.var}}");
  });

  it("serializes to JSON", () => {
    const ctx = new ExecutionContext({
      variables: { key: "val" },
      triggerData: { event: "test" },
      userId: "u1",
      organizationId: "o1",
      workflowId: "wf1",
      runId: "r1",
    });
    const json = ctx.toJSON();
    expect(json.variables).toEqual({ key: "val" });
    expect(json.triggerData).toEqual({ event: "test" });
  });
});

describe("Condition Evaluation", () => {
  it("evaluates equals condition", () => {
    const ctx = new ExecutionContext({
      variables: { status: "active" },
      triggerData: {},
      userId: "u1",
      organizationId: "o1",
      workflowId: "wf1",
      runId: "r1",
    });
    const node = {
      id: "cond-1",
      type: "CONDITION" as const,
      label: "Check Status",
      config: { field: "{{variable.status}}", operator: "equals", value: "active" },
      positionX: 0,
      positionY: 0,
    };
    const result = evaluateCondition(node, ctx);
    expect(result.result).toBe(true);
  });

  it("evaluates contains condition", () => {
    const ctx = new ExecutionContext({
      variables: { text: "hello world" },
      triggerData: {},
      userId: "u1",
      organizationId: "o1",
      workflowId: "wf1",
      runId: "r1",
    });
    const node = {
      id: "cond-1",
      type: "CONDITION" as const,
      label: "Check Contains",
      config: { field: "{{variable.text}}", operator: "contains", value: "world" },
      positionX: 0,
      positionY: 0,
    };
    const result = evaluateCondition(node, ctx);
    expect(result.result).toBe(true);
  });

  it("evaluates is_empty condition", () => {
    const ctx = new ExecutionContext({
      variables: { value: "" },
      triggerData: {},
      userId: "u1",
      organizationId: "o1",
      workflowId: "wf1",
      runId: "r1",
    });
    const node = {
      id: "cond-1",
      type: "CONDITION" as const,
      label: "Check Empty",
      config: { field: "{{variable.value}}", operator: "is_empty", value: "" },
      positionX: 0,
      positionY: 0,
    };
    const result = evaluateCondition(node, ctx);
    expect(result.result).toBe(true);
  });
});

describe("Variable Node", () => {
  it("sets a variable in context", () => {
    const ctx = new ExecutionContext({
      variables: {},
      triggerData: {},
      userId: "u1",
      organizationId: "o1",
      workflowId: "wf1",
      runId: "r1",
    });
    const node = {
      id: "var-1",
      type: "VARIABLE" as const,
      label: "Set Name",
      config: { operation: "set", name: "username", value: "john" },
      positionX: 0,
      positionY: 0,
    };
    executeVariable(node, ctx);
    expect(ctx.getVariable("username")).toBe("john");
  });

  it("deletes a variable from context", () => {
    const ctx = new ExecutionContext({
      variables: { temp: "value" },
      triggerData: {},
      userId: "u1",
      organizationId: "o1",
      workflowId: "wf1",
      runId: "r1",
    });
    const node = {
      id: "var-1",
      type: "VARIABLE" as const,
      label: "Delete Temp",
      config: { operation: "delete", name: "temp", value: "" },
      positionX: 0,
      positionY: 0,
    };
    executeVariable(node, ctx);
    expect(ctx.getVariable("temp")).toBeUndefined();
  });
});

describe("Delay Node", () => {
  it("waits for specified duration", async () => {
    const ctx = new ExecutionContext({
      variables: {},
      triggerData: {},
      userId: "u1",
      organizationId: "o1",
      workflowId: "wf1",
      runId: "r1",
    });
    const node = {
      id: "delay-1",
      type: "DELAY" as const,
      label: "Wait 1s",
      config: { duration: 1 },
      positionX: 0,
      positionY: 0,
    };
    const start = Date.now();
    const result = await executeDelay(node, ctx);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(900);
    expect(result.durationMs).toBe(1000);
  });
});
