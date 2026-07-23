import type { RunStatus, NodeStatus, WorkflowNodeType, TriggerType } from "@prisma/client";

export type { RunStatus, NodeStatus, WorkflowNodeType };

export interface RetryPolicy {
  strategy: "exponential" | "linear" | "fixed";
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs?: number;
}

export interface TimeoutConfig {
  workflowMs: number;
  nodeMs: number;
  externalApiMs: number;
  aiMs: number;
  webhookMs: number;
  publishMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  strategy: "exponential",
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
};

export const DEFAULT_TIMEOUTS: TimeoutConfig = {
  workflowMs: 300000,
  nodeMs: 60000,
  externalApiMs: 15000,
  aiMs: 60000,
  webhookMs: 30000,
  publishMs: 30000,
};

export interface ExecutionNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  config: Record<string, unknown>;
  positionX: number;
  positionY: number;
}

export interface ExecutionEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string | null;
  targetHandle: string | null;
  label: string | null;
}

export interface NodeOutput {
  nodeId: string;
  nodeType: WorkflowNodeType;
  output: unknown;
  status: NodeStatus;
  duration: number;
  error?: string;
  retryCount?: number;
}

export class ExecutionError extends Error {
  constructor(
    message: string,
    public readonly code: string = "EXECUTION_ERROR",
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "ExecutionError";
  }
}

export class RetryableError extends ExecutionError {
  constructor(message: string, code: string = "RETRYABLE_ERROR") {
    super(message, code, true);
    this.name = "RetryableError";
  }
}

export class FatalError extends ExecutionError {
  constructor(message: string, code: string = "FATAL_ERROR") {
    super(message, code, false);
    this.name = "FatalError";
  }
}

export class ValidationError extends ExecutionError {
  constructor(message: string, code: string = "VALIDATION_ERROR") {
    super(message, code, false);
    this.name = "ValidationError";
  }
}

export class TimeoutError extends RetryableError {
  constructor(message: string, code: string = "TIMEOUT_ERROR") {
    super(message, code);
    this.name = "TimeoutError";
  }
}

export class PermissionError extends ExecutionError {
  constructor(message: string, code: string = "PERMISSION_ERROR") {
    super(message, code, false);
    this.name = "PermissionError";
  }
}

export class ExternalApiError extends RetryableError {
  constructor(message: string, code: string = "EXTERNAL_API_ERROR", public readonly statusCode?: number) {
    super(message, code);
    this.name = "ExternalApiError";
  }
}

export function classifyError(err: unknown): ExecutionError {
  if (err instanceof ExecutionError) return err;

  const message = err instanceof Error ? err.message : String(err);

  if (
    message.toLowerCase().includes("timeout") ||
    message.toLowerCase().includes("timed out")
  ) {
    return new TimeoutError(message);
  }

  if (
    message.toLowerCase().includes("permission") ||
    message.toLowerCase().includes("unauthorized") ||
    message.toLowerCase().includes("forbidden")
  ) {
    return new PermissionError(message);
  }

  if (
    message.toLowerCase().includes("api error") ||
    message.toLowerCase().includes("api key") ||
    message.toLowerCase().includes("rate limit") ||
    message.toLowerCase().includes("5")
  ) {
    return new ExternalApiError(message);
  }

  if (
    message.toLowerCase().includes("validation") ||
    message.toLowerCase().includes("invalid")
  ) {
    return new ValidationError(message);
  }

  return new RetryableError(message);
}

export function computeRetryDelay(policy: RetryPolicy, attempt: number): number {
  switch (policy.strategy) {
    case "exponential":
      return Math.min(policy.initialDelayMs * Math.pow(2, attempt), policy.maxDelayMs ?? 30000);
    case "linear":
      return Math.min(policy.initialDelayMs * (attempt + 1), policy.maxDelayMs ?? 30000);
    case "fixed":
      return Math.min(policy.initialDelayMs, policy.maxDelayMs ?? policy.initialDelayMs);
    default:
      return policy.initialDelayMs;
  }
}
