import { prisma } from "@/lib/prisma";
import { WorkflowRunner } from "./runner";
import { WorkflowValidator } from "./validator";
import { WorkflowCompiler } from "./compiler";

export interface ExecutionContext {
  workflowId: string;
  runId: string;
  organizationId: string;
  userId: string;
  triggerType: string;
  triggerData?: Record<string, unknown>;
  variables: Record<string, unknown>;
  nodeResults: Map<string, unknown>;
}

export class WorkflowEngine {
  static async execute(workflowId: string, options: {
    organizationId: string;
    userId: string;
    triggerType?: string;
    triggerData?: Record<string, unknown>;
    variables?: Record<string, unknown>;
  }) {
    const workflow = await prisma.workflows.findFirst({
      where: { id: workflowId, organizationId: options.organizationId, deletedAt: null },
    });
    if (!workflow) throw new Error("Workflow not found");
    if (workflow.status !== "PUBLISHED") throw new Error("Workflow is not published");

    const { nodes, edges } = await this.loadNodesAndEdges(workflowId);

    const validation = WorkflowValidator.validate(nodes, edges);
    if (!validation.valid) throw new Error(`Workflow validation failed: ${validation.errors.join(", ")}`);

    const compiled = WorkflowCompiler.compile(nodes, edges);
    if (!compiled.entryNode) throw new Error("Workflow has no entry point");

    const run = await prisma.workflowRuns.create({
      data: {
        workflowId,
        status: "RUNNING",
        triggerType: options.triggerType ?? "manual",
        triggerData: options.triggerData as any,
        startedAt: new Date(),
        createdById: options.userId,
        maxRetries: 3,
      },
    });

    const context: ExecutionContext = {
      workflowId,
      runId: run.id,
      organizationId: options.organizationId,
      userId: options.userId,
      triggerType: options.triggerType ?? "manual",
      triggerData: options.triggerData,
      variables: options.variables ?? {},
      nodeResults: new Map(),
    };

    const runner = new WorkflowRunner(context, compiled);
    const result = await runner.run();

    const duration = run.startedAt ? Date.now() - run.startedAt.getTime() : 0;
    await prisma.workflowRuns.update({
      where: { id: run.id },
      data: {
        status: result.success ? "COMPLETED" : "FAILED",
        completedAt: new Date(),
        duration,
        error: result.error ?? null,
      },
    });

    return { runId: run.id, success: result.success, error: result.error, duration };
  }

  static async loadNodesAndEdges(workflowId: string) {
    const [nodes, edges] = await Promise.all([
      prisma.workflowNodes.findMany({ where: { workflowId, deletedAt: null } }),
      prisma.workflowEdges.findMany({ where: { workflowId, deletedAt: null } }),
    ]);
    return { nodes, edges };
  }

  static async cancel(runId: string) {
    return prisma.workflowRuns.update({
      where: { id: runId },
      data: { status: "CANCELLED", completedAt: new Date() },
    });
  }

  static async getRunStatus(runId: string) {
    return prisma.workflowRuns.findUnique({ where: { id: runId } });
  }
}
