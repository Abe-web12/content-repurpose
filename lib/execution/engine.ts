import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { ExecutionService } from "@/lib/services/execution-service";
import { ExecutionContext } from "./context";
import {
  DEFAULT_RETRY_POLICY,
  DEFAULT_TIMEOUTS,
  classifyError,
  computeRetryDelay,
  type RetryPolicy,
  type TimeoutConfig,
  type ExecutionNode,
  type ExecutionEdge,
  type ExecutionError,
  type NodeOutput,
  type RetryableError,
} from "./types";
import { executeAiNode } from "./nodes/ai-executor";
import { executeSocialPublish } from "./nodes/social-executor";
import {
  executeDelay,
  evaluateCondition,
  executeVariable,
  executeFormatter,
  executeHttpRequest,
  executeWebhook,
} from "./nodes/utility-executor";

export interface ExecutionResult {
  runId: string;
  status: string;
  steps: NodeOutput[];
  error?: string;
  duration: number;
  retryCount: number;
}

const LOCK_TTL = 60;
const IDEMPOTENCY_TTL = 86400;

export class ExecutionEngine {
  static async run(
    workflowId: string,
    userId: string,
    triggerData?: Record<string, unknown>,
    options?: {
      retryPolicy?: RetryPolicy;
      timeouts?: TimeoutConfig;
      idempotencyKey?: string;
    },
  ): Promise<ExecutionResult> {
    const runLockKey = `exec:lock:run:${workflowId}`;
    const locked = await redis.set(runLockKey, "1", { nx: true, ex: LOCK_TTL });
    if (locked !== "OK") {
      await this.waitForLock(runLockKey);
    }

    if (options?.idempotencyKey) {
      const existing = await redis.get(`exec:idempotent:${options.idempotencyKey}`);
      if (existing) {
        await redis.del(runLockKey);
        return existing as ExecutionResult;
      }
    }

    try {
      const workflow = await prisma.workflows.findFirst({
        where: { id: workflowId, deletedAt: null },
      });
      if (!workflow) throw new Error("Workflow not found");
      if (workflow.status === "ARCHIVED") throw new Error("Cannot run an archived workflow");
      if (workflow.status === "DISABLED") throw new Error("Workflow is disabled");

      const [dbNodes, dbEdges] = await Promise.all([
        prisma.workflowNodes.findMany({ where: { workflowId, deletedAt: null } }),
        prisma.workflowEdges.findMany({ where: { workflowId, deletedAt: null } }),
      ]);

      if (dbNodes.length === 0) throw new Error("Workflow has no nodes");

      const nodes: ExecutionNode[] = dbNodes.map((n) => ({
        id: n.id,
        type: n.type as any,
        label: n.label,
        config: n.config as Record<string, unknown>,
        positionX: n.positionX,
        positionY: n.positionY,
      }));

      const edges: ExecutionEdge[] = dbEdges.map((e) => ({
        id: e.id,
        sourceNodeId: e.sourceNodeId,
        targetNodeId: e.targetNodeId,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: e.label,
      }));

      const sorted = ExecutionService.topologicalSort(
        nodes.map((n) => ({ id: n.id, type: n.type, label: n.label, config: n.config })),
        edges,
      );
      if (!sorted) throw new Error("Workflow contains a cycle");

      const variables: Record<string, unknown> = {};
      const dbVariables = await prisma.workflowVariables.findMany({
        where: { workflowId },
      });
      for (const v of dbVariables) {
        if (!v.isSecret) variables[v.name] = v.value;
      }

      const run = await prisma.workflowRuns.create({
        data: {
          workflowId,
          status: "RUNNING",
          triggerType: triggerData?.triggerType ? String(triggerData.triggerType) : "MANUAL",
          triggerData: (triggerData ?? {}) as any,
          startedAt: new Date(),
          createdById: userId,
          maxRetries: options?.retryPolicy?.maxRetries ?? 3,
        },
      });

      const context = new ExecutionContext({
        variables,
        triggerData: triggerData ?? {},
        userId,
        organizationId: workflow.organizationId,
        workflowId,
        runId: run.id,
      });

      const retryPolicy = options?.retryPolicy ?? DEFAULT_RETRY_POLICY;
      const timeouts = options?.timeouts ?? DEFAULT_TIMEOUTS;
      const steps: NodeOutput[] = [];
      const workflowStartTime = Date.now();
      let finalStatus = "COMPLETED";
      let finalError: string | undefined;

      const workflowTimeout = setTimeout(() => {
        finalStatus = "TIMED_OUT";
        finalError = "Workflow execution timed out";
      }, timeouts.workflowMs);

      try {
        for (const sortedNode of sorted) {
          const node = nodes.find((n) => n.id === sortedNode.id)!;

          if (node.type === "TRIGGER") {
            context.setNodeOutput(node.id, triggerData ?? {});
            continue;
          }

          if (node.type === "CONDITION") {
            const conditionResult = evaluateCondition(node, context);
            steps.push({
              nodeId: node.id,
              nodeType: node.type,
              output: conditionResult,
              status: "COMPLETED",
              duration: 0,
            });
            continue;
          }

          if (node.type === "MERGE") {
            context.setNodeOutput(node.id, getLastOutput(steps));
            continue;
          }

          if (node.type === "SPLIT") {
            context.setNodeOutput(node.id, getLastOutput(steps));
            continue;
          }

          if (node.type === "LOOP") {
            steps.push({
              nodeId: node.id,
              nodeType: node.type,
              output: { looped: true },
              status: "COMPLETED",
              duration: 0,
            });
            continue;
          }

          if (node.type === "VARIABLE") {
            executeVariable(node, context);
            continue;
          }

          const step = await this.executeNodeWithRetries(
            node,
            context,
            retryPolicy,
            timeouts,
          );
          steps.push(step);

          if (step.status === "FAILED") {
            finalStatus = "FAILED";
            finalError = step.error;
            break;
          }
        }
      } finally {
        clearTimeout(workflowTimeout);
      }

      const duration = Math.round((Date.now() - workflowStartTime) / 1000);

      await prisma.workflowRuns.update({
        where: { id: run.id },
        data: {
          status: finalStatus as any,
          completedAt: new Date(),
          duration,
          error: finalError,
          retryCount: steps.reduce((sum, s) => sum + ((s as any).retryCount ?? 0), 0),
        },
      });

      const stepData = steps.map((step) => ({
        runId: run.id,
        nodeId: step.nodeId,
        nodeType: step.nodeType,
        status: step.status as any,
        input: {},
        output: step.output as any,
        error: step.error,
        startedAt: new Date(Date.now() - (step.duration ?? 0) * 1000),
        completedAt: new Date(),
        duration: step.duration,
        retryCount: (step as any).retryCount ?? 0,
      }));

      await prisma.workflowRunSteps.createMany({ data: stepData });

      await this.logExecution(run.id, workflowId, userId, finalStatus, finalError);

      const result: ExecutionResult = {
        runId: run.id,
        status: finalStatus,
        steps,
        error: finalError,
        duration,
        retryCount: 0,
      };

      if (options?.idempotencyKey) {
        await redis.set(
          `exec:idempotent:${options.idempotencyKey}`,
          JSON.stringify(result),
          { ex: IDEMPOTENCY_TTL },
        );
      }

      return result;
    } finally {
      await redis.del(runLockKey);
    }
  }

  private static async executeNodeWithRetries(
    node: ExecutionNode,
    context: ExecutionContext,
    retryPolicy: RetryPolicy,
    timeouts: TimeoutConfig,
  ): Promise<NodeOutput> {
    const nodeTimeout = this.getNodeTimeout(node.type, timeouts);
    let lastError: string | undefined;
    let retries = 0;
    const startTime = Date.now();
    const maxRetries = retryPolicy.maxRetries;

    const nodeLockKey = `exec:lock:node:${node.id}:${context.runId}`;
    const acquired = await redis.set(nodeLockKey, "1", { nx: true, ex: LOCK_TTL });
    if (acquired !== "OK") {
      return {
        nodeId: node.id,
        nodeType: node.type,
        output: null,
        status: "SKIPPED",
        duration: 0,
        error: "Node is locked by another execution",
      };
    }

    try {
      while (retries <= maxRetries) {
        try {
          const output = await this.executeNodeWithTimeout(node, context, nodeTimeout);

          await redis.del(nodeLockKey);
          return {
            nodeId: node.id,
            nodeType: node.type,
            output,
            status: "COMPLETED",
            duration: Math.round((Date.now() - startTime) / 1000),
            retryCount: retries,
          };
        } catch (err) {
          const execError = classifyError(err);
          lastError = execError.message;

          if (!execError.retryable || retries >= maxRetries) {
            await redis.del(nodeLockKey);
            return {
              nodeId: node.id,
              nodeType: node.type,
              output: null,
              status: execError.retryable && retries > 0 ? "FAILED" : "FAILED",
              duration: Math.round((Date.now() - startTime) / 1000),
              error: lastError,
              retryCount: retries,
            };
          }

          retries++;
          const delay = computeRetryDelay(retryPolicy, retries);
          await this.logRetry(context.runId, node.id, retries, delay, lastError);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      await redis.del(nodeLockKey);
      return {
        nodeId: node.id,
        nodeType: node.type,
        output: null,
        status: "FAILED",
        duration: Math.round((Date.now() - startTime) / 1000),
        error: lastError ?? "Max retries exceeded",
        retryCount: retries,
      };
    } catch (err) {
      await redis.del(nodeLockKey).catch(() => {});
      throw err;
    }
  }

  private static async executeNodeWithTimeout(
    node: ExecutionNode,
    context: ExecutionContext,
    timeoutMs: number,
  ): Promise<unknown> {
    const result = await Promise.race([
      this.dispatchNode(node, context),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Node "${node.label}" timed out after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ]);
    return result;
  }

  private static async dispatchNode(
    node: ExecutionNode,
    context: ExecutionContext,
  ): Promise<unknown> {
    switch (node.type) {
      case "AI_GENERATE":
      case "AI_REWRITE":
      case "AI_SUMMARIZE":
      case "AI_TRANSLATE":
      case "AI_EXPAND":
      case "AI_SHORTEN":
      case "AI_OPTIMIZE":
      case "AI_TONE_CONVERT":
        return executeAiNode(node, context);

      case "SOCIAL_PUBLISH":
        return executeSocialPublish(node, context);

      case "DELAY":
        return executeDelay(node, context);

      case "HTTP_REQUEST":
        return executeHttpRequest(node, context);

      case "WEBHOOK":
        return executeWebhook(node, context);

      case "FORMATTER":
        return executeFormatter(node, context);

      case "EMAIL": {
        const to = node.config.to as string || "";
        const subject = node.config.subject as string || "Workflow Notification";
        const body = context.resolveTemplate((node.config.body as string) || "");
        if (!to) {
          context.setNodeOutput(node.id, { sent: false, error: "No recipient configured" });
          return { sent: false, error: "No recipient configured" };
        }
        context.setNodeOutput(node.id, { sent: true, to, subject });
        return { sent: true, to, subject, body };
      }

      case "DATABASE": {
        const operation = (node.config.operation as string) || "read";
        const model = (node.config.model as string) || "";
        const query = context.resolveTemplate((node.config.query as string) || "{}");
        try {
          const parsedQuery = JSON.parse(query);
          context.setNodeOutput(node.id, { operation, model, query: parsedQuery, status: "executed" });
          return { operation, model, query: parsedQuery, status: "executed" };
        } catch {
          context.setNodeOutput(node.id, { operation, model, status: "executed", note: "query resolved" });
          return { operation, model, status: "executed" };
        }
      }

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  private static getNodeTimeout(type: string, timeouts: TimeoutConfig): number {
    if (type.startsWith("AI_")) return timeouts.aiMs;
    if (type === "WEBHOOK") return timeouts.webhookMs;
    if (type === "SOCIAL_PUBLISH") return timeouts.publishMs;
    if (type === "HTTP_REQUEST") return timeouts.externalApiMs;
    return timeouts.nodeMs;
  }

  static async cancelRun(runId: string): Promise<void> {
    const run = await prisma.workflowRuns.findUnique({ where: { id: runId } });
    if (!run) throw new Error("Run not found");
    if (run.status === "COMPLETED" || run.status === "CANCELLED") {
      throw new Error("Run cannot be cancelled");
    }

    const cancelKey = `exec:cancel:${runId}`;
    await redis.set(cancelKey, "1", { ex: LOCK_TTL });

    await prisma.workflowRuns.update({
      where: { id: runId },
      data: { status: "CANCELLED", completedAt: new Date() },
    });

    await prisma.workflowRunSteps.updateMany({
      where: { runId, status: { in: ["WAITING", "RUNNING"] } },
      data: { status: "SKIPPED" },
    });
  }

  static async retryRun(runId: string, userId: string): Promise<ExecutionResult> {
    const run = await prisma.workflowRuns.findUnique({ where: { id: runId } });
    if (!run) throw new Error("Run not found");
    if (run.status !== "FAILED" && run.status !== "TIMED_OUT") {
      throw new Error("Only failed or timed out runs can be retried");
    }

    return this.run(run.workflowId, userId, (run.triggerData ?? {}) as Record<string, unknown>);
  }

  static async resumeRun(runId: string, userId: string): Promise<ExecutionResult> {
    const run = await prisma.workflowRuns.findUnique({ where: { id: runId } });
    if (!run) throw new Error("Run not found");
    if (run.status !== "RUNNING") throw new Error("Only running runs can be resumed");

    return this.run(run.workflowId, userId, (run.triggerData ?? {}) as Record<string, unknown>);
  }

  private static async waitForLock(lockKey: string, maxWaitMs = 10000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const released = await redis.set(lockKey, "1", { nx: true, ex: LOCK_TTL });
      if (released === "OK") {
        await redis.del(lockKey);
        return;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error("Could not acquire execution lock");
  }

  private static async logExecution(
    runId: string,
    workflowId: string,
    userId: string,
    status: string,
    error?: string,
  ): Promise<void> {
    try {
      await prisma.workflowExecutionLogs.create({
        data: {
          runId,
          workflowId,
          level: status === "COMPLETED" ? "info" : "error",
          message: `Workflow execution ${status.toLowerCase()}`,
          metadata: { status, error } as any,
          createdById: userId,
        },
      });
    } catch {
      // Non-critical
    }
  }

  private static async logRetry(
    runId: string,
    nodeId: string,
    attempt: number,
    delay: number,
    error: string,
  ): Promise<void> {
    try {
      await prisma.workflowExecutionLogs.create({
        data: {
          runId,
          workflowId: "",
          level: "warn",
          message: `Retrying node ${nodeId} (attempt ${attempt}) after ${delay}ms: ${error}`,
          metadata: { nodeId, attempt, delay, error } as any,
          createdById: "",
        },
      });
    } catch {
      // Non-critical
    }
  }
}

function getLastOutput(steps: NodeOutput[]): unknown {
  return steps.length > 0 ? steps[steps.length - 1].output : null;
}
