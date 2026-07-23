import { prisma } from "@/lib/prisma";
import { WorkflowExecutor } from "./executor";
import { WorkflowRetry } from "./retry";
import type { ExecutionContext } from "./engine";
import type { CompiledWorkflow } from "./compiler";
import type { WorkflowNodeType, NodeStatus } from "@prisma/client";

interface RunResult {
  success: boolean;
  error?: string;
  nodeResults: Map<string, unknown>;
}

export class WorkflowRunner {
  private context: ExecutionContext;
  private compiled: CompiledWorkflow;
  private cancelled = false;

  constructor(context: ExecutionContext, compiled: CompiledWorkflow) {
    this.context = context;
    this.compiled = compiled;
  }

  cancel() {
    this.cancelled = true;
  }

  async run(): Promise<RunResult> {
    const executor = new WorkflowExecutor(this.context);

    for (const nodeId of this.compiled.executionOrder) {
      if (this.cancelled) {
        return { success: false, error: "Workflow cancelled", nodeResults: this.context.nodeResults };
      }

      const node = this.compiled.nodes.get(nodeId);
      if (!node) continue;

      await this.logStep(nodeId, "RUNNING");

      const executeNode = async () => {
        const result = await executor.execute(node);
        this.context.nodeResults.set(nodeId, result);
        return result;
      };

      try {
        const result = await WorkflowRetry.withRetry(
          executeNode,
          { maxRetries: 2, initialDelay: 1000 },
          (attempt, error) => this.logRetry(nodeId, attempt, error),
        );

        await this.logStep(nodeId, "COMPLETED", result as Record<string, unknown>);

        if (node.type === "CONDITION") {
          const branchResult = result as { condition: boolean; output: unknown };
          await this.pruneBranches(nodeId, branchResult.condition);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Node execution failed";
        await this.logStep(nodeId, "FAILED", undefined, msg);
        return { success: false, error: msg, nodeResults: this.context.nodeResults };
      }
    }

    return { success: true, nodeResults: this.context.nodeResults };
  }

  private async logStep(nodeId: string, status: string, output?: Record<string, unknown>, error?: string) {
    try {
      const existing = await prisma.workflowRunSteps.findFirst({
        where: { runId: this.context.runId, nodeId },
      });

      if (existing) {
        await prisma.workflowRunSteps.update({
          where: { id: existing.id },
          data: {
            status: status as NodeStatus,
            output: output as any,
            error: error ?? null,
            completedAt: status === "COMPLETED" || status === "FAILED" ? new Date() : null,
          },
        });
      } else {
        const node = this.compiled.nodes.get(nodeId);
        await prisma.workflowRunSteps.create({
          data: {
            runId: this.context.runId,
            nodeId,
            nodeType: node?.type,
            nodeLabel: node?.label,
            status: status as NodeStatus,
            output: output as any,
            error: error ?? null,
            startedAt: status === "RUNNING" ? new Date() : null,
            completedAt: status === "COMPLETED" || status === "FAILED" ? new Date() : null,
          },
        });
      }
    } catch { /* non-critical */ }
  }

  private async logRetry(nodeId: string, attempt: number, error: unknown) {
    try {
      await prisma.workflowRunSteps.upsert({
        where: { id: `${this.context.runId}-${nodeId}-${attempt}` },
        create: {
          runId: this.context.runId,
          nodeId,
          nodeType: this.compiled.nodes.get(nodeId)?.type,
          nodeLabel: this.compiled.nodes.get(nodeId)?.label,
          status: "WAITING",
          error: `Retry ${attempt}: ${error instanceof Error ? error.message : String(error)}`,
        },
        update: {},
      });
    } catch { /* non-critical */ }
  }

  private async pruneBranches(conditionNodeId: string, conditionResult: boolean) {
    const edges = this.compiled.adjacency.get(conditionNodeId) || [];
    const branchToPrune = conditionResult ? "false" : "true";

    const edgesToPrune = edges.filter((e) => e.sourceHandle === branchToPrune);
    for (const edge of edgesToPrune) {
      this.skipSubtree(edge.targetNodeId);
    }
  }

  private skipSubtree(nodeId: string) {
    const node = this.compiled.nodes.get(nodeId);
    if (!node) return;
    this.context.nodeResults.set(nodeId, { skipped: true });
    const edges = this.compiled.adjacency.get(nodeId) || [];
    for (const edge of edges) {
      this.skipSubtree(edge.targetNodeId);
    }
  }
}
