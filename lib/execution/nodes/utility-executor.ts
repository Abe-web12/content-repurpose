import type { ExecutionContext } from "../context";
import type { ExecutionNode } from "../types";
import { RetryableError, ValidationError, FatalError, ExternalApiError } from "../types";

export interface DelayResult {
  durationMs: number;
  completedAt: string;
}

export interface ConditionResult {
  condition: string;
  result: boolean;
}

export interface VariableResult {
  name: string;
  value: unknown;
}

export interface FormatterResult {
  formatted: string;
  format: string;
}

export interface HttpResult {
  status: number;
  data: unknown;
  headers: Record<string, string>;
}

export async function executeDelay(node: ExecutionNode, context: ExecutionContext): Promise<DelayResult> {
  const config = node.config;
  const duration = (config.duration as number) ?? 60;
  const durationMs = duration * 1000;

  await new Promise((resolve) => setTimeout(resolve, durationMs));

  const result: DelayResult = {
    durationMs,
    completedAt: new Date().toISOString(),
  };

  context.setNodeOutput(node.id, result);
  return result;
}

export function evaluateCondition(node: ExecutionNode, context: ExecutionContext): ConditionResult {
  const config = node.config;
  const field = (config.field as string) || "";
  const operator = (config.operator as string) || "equals";
  const value = config.value;

  const resolvedField = context.resolveTemplate(field);
  const resolvedValue = typeof value === "string" ? context.resolveTemplate(value) : value;

  let result = false;

  switch (operator) {
    case "equals":
    case "==":
      result = String(resolvedField) === String(resolvedValue);
      break;
    case "not_equals":
    case "!=":
      result = String(resolvedField) !== String(resolvedValue);
      break;
    case "contains":
      result = String(resolvedField).includes(String(resolvedValue));
      break;
    case "not_contains":
      result = !String(resolvedField).includes(String(resolvedValue));
      break;
    case "greater_than":
    case ">":
      result = Number(resolvedField) > Number(resolvedValue);
      break;
    case "less_than":
    case "<":
      result = Number(resolvedField) < Number(resolvedValue);
      break;
    case "is_empty":
      result = !resolvedField || String(resolvedField).trim() === "";
      break;
    case "is_not_empty":
      result = !!resolvedField && String(resolvedField).trim() !== "";
      break;
    case "starts_with":
      result = String(resolvedField).startsWith(String(resolvedValue));
      break;
    case "ends_with":
      result = String(resolvedField).endsWith(String(resolvedValue));
      break;
    default:
      result = String(resolvedField) === String(resolvedValue);
  }

  const conditionResult: ConditionResult = {
    condition: `${field} ${operator} ${value}`,
    result,
  };

  context.setNodeOutput(node.id, conditionResult);
  return conditionResult;
}

export function executeVariable(node: ExecutionNode, context: ExecutionContext): VariableResult {
  const config = node.config;
  const operation = (config.operation as string) || "set";
  const name = (config.name as string) || "";
  const value = config.value;

  const resolvedValue = typeof value === "string" ? context.resolveTemplate(value) : value;

  if (operation === "set" || operation === "assign") {
    context.setVariable(name, resolvedValue);
  } else if (operation === "delete" || operation === "unset") {
    context.variables.delete(name);
  }

  const result: VariableResult = {
    name,
    value: operation === "delete" ? undefined : resolvedValue,
  };

  context.setNodeOutput(node.id, result);
  return result;
}

export async function executeFormatter(node: ExecutionNode, context: ExecutionContext): Promise<FormatterResult> {
  const config = node.config;
  const format = (config.format as string) || "markdown";

  const lastOutput = getLastOutput(context);
  let input = "";

  if (typeof lastOutput === "string") {
    input = lastOutput;
  } else if (lastOutput && typeof lastOutput === "object") {
    const obj = lastOutput as Record<string, unknown>;
    input = (obj.content as string) || (obj.output as string) || (obj.text as string) || JSON.stringify(obj);
  }

  if (config.input) {
    input = context.resolveTemplate(config.input as string);
  }

  let formatted = input;

  switch (format) {
    case "uppercase":
      formatted = input.toUpperCase();
      break;
    case "lowercase":
      formatted = input.toLowerCase();
      break;
    case "capitalize":
      formatted = input.replace(/\b\w/g, (c) => c.toUpperCase());
      break;
    case "trim":
      formatted = input.trim();
      break;
    case "json":
      try {
        const parsed = JSON.parse(input);
        formatted = JSON.stringify(parsed, null, 2);
      } catch {
        formatted = input;
      }
      break;
    case "markdown":
    case "plain":
    default:
      break;
  }

  if (config.prefix) {
    formatted = `${context.resolveTemplate(config.prefix as string)}${formatted}`;
  }
  if (config.suffix) {
    formatted = `${formatted}${context.resolveTemplate(config.suffix as string)}`;
  }

  const result: FormatterResult = { formatted, format };
  context.setNodeOutput(node.id, formatted);
  return result;
}

export async function executeHttpRequest(node: ExecutionNode, context: ExecutionContext): Promise<HttpResult> {
  const config = node.config;
  const method = (config.method as string) || "GET";
  const url = context.resolveTemplate((config.url as string) || "");

  if (!url) {
    throw new ValidationError("HTTP request URL is required");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(config.headers as Record<string, string> ?? {}),
  };

  const body = config.body ? context.resolveTemplate(JSON.stringify(config.body)) : undefined;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method !== "GET" && method !== "HEAD" ? body : undefined,
      signal: AbortSignal.timeout((config.timeout as number) ?? 15000),
    });

    let data: unknown;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      throw new ExternalApiError(
        `HTTP ${response.status}: ${JSON.stringify(data)}`,
        "HTTP_ERROR",
        response.status,
      );
    }

    const respHeaders: Record<string, string> = {};
    response.headers.forEach((v, k) => { respHeaders[k] = v; });

    const result: HttpResult = {
      status: response.status,
      data,
      headers: respHeaders,
    };

    context.setNodeOutput(node.id, result);
    return result;
  } catch (err) {
    if (err instanceof FatalError || err instanceof ExternalApiError) throw err;
    throw new ExternalApiError(err instanceof Error ? err.message : "HTTP request failed");
  }
}

export async function executeWebhook(node: ExecutionNode, context: ExecutionContext): Promise<HttpResult> {
  const config = node.config;
  const method = (config.method as string) || "POST";
  const url = context.resolveTemplate((config.url as string) || "");

  if (!url) {
    throw new ValidationError("Webhook URL is required");
  }

  const lastOutput = getLastOutput(context);
  const payload = {
    event: "workflow.node.completed",
    workflowId: context.workflowId,
    runId: context.runId,
    nodeId: node.id,
    nodeType: node.type,
    data: lastOutput ?? {},
    timestamp: new Date().toISOString(),
  };

  const signature = config.secret
    ? await generateSignature(JSON.stringify(payload), config.secret as string)
    : undefined;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(signature ? { "X-Webhook-Signature": signature } : {}),
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout((config.timeout as number) ?? 30000),
    });

    let data: unknown;
    const ct = response.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      throw new ExternalApiError(
        `Webhook ${response.status}: ${JSON.stringify(data)}`,
        "WEBHOOK_ERROR",
        response.status,
      );
    }

    const result: HttpResult = {
      status: response.status,
      data,
      headers: {},
    };

    context.setNodeOutput(node.id, result);
    return result;
  } catch (err) {
    if (err instanceof ExternalApiError || err instanceof FatalError) throw err;
    throw new ExternalApiError(`Webhook call failed: ${err instanceof Error ? err.message : "Unknown"}`);
  }
}

async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function getLastOutput(context: ExecutionContext): unknown {
  let lastValue: unknown = undefined;
  for (const [, output] of context.nodeOutputs) {
    lastValue = output;
  }
  return lastValue;
}
