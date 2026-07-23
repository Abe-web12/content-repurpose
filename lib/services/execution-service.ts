import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";

interface GraphNode {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown> | null;
}

interface GraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export class ExecutionService {
  static async startRun(workflowId: string, userId: string, triggerData?: Record<string, unknown> | null) {
    const workflow = await prisma.workflows.findFirst({
      where: { id: workflowId, deletedAt: null },
    });
    if (!workflow) throw new AppError("Workflow not found", 404);
    if (workflow.status === "ARCHIVED") throw new AppError("Cannot run an archived workflow", 400);
    if (workflow.status === "DISABLED") throw new AppError("Workflow is disabled", 400);

    const [dbNodes, edges] = await Promise.all([
      prisma.workflowNodes.findMany({ where: { workflowId, deletedAt: null } }),
      prisma.workflowEdges.findMany({ where: { workflowId, deletedAt: null } }),
    ]);

    if (dbNodes.length === 0) throw new AppError("Workflow has no nodes", 400);

    const nodes: GraphNode[] = dbNodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      config: n.config as Record<string, unknown> | null,
    }));

    const sorted = this.topologicalSort(nodes, edges);
    if (!sorted) throw new AppError("Workflow contains a cycle", 400);

    const run = await prisma.workflowRuns.create({
      data: {
        workflowId,
        status: "PENDING",
        triggerType: "MANUAL",
        triggerData: (triggerData ?? {}) as any,
        createdById: userId,
        maxRetries: 3,
      },
    });

    return run;
  }

  static topologicalSort(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] | null {
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const node of nodes) {
      adj.set(node.id, []);
      inDegree.set(node.id, 0);
    }
    for (const edge of edges) {
      adj.get(edge.sourceNodeId)?.push(edge.targetNodeId);
      inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const result: GraphNode[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = nodes.find((n) => n.id === nodeId);
      if (node) result.push(node);
      for (const neighbor of adj.get(nodeId) ?? []) {
        const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) queue.push(neighbor);
      }
    }

    if (result.length !== nodes.length) return null;
    return result;
  }

  static async getRuns(workflowId: string, organizationId: string, options?: {
    limit?: number;
    cursor?: string;
    status?: string;
  }) {
    const workflow = await prisma.workflows.findFirst({
      where: { id: workflowId, organizationId, deletedAt: null },
    });
    if (!workflow) throw new AppError("Workflow not found", 404);

    const where: Record<string, unknown> = { workflowId };
    if (options?.status) where.status = options.status;

    const limit = Math.min(options?.limit ?? 20, 100);
    const runs = await prisma.workflowRuns.findMany({
      where,
      take: limit + 1,
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = runs.length > limit;
    const data = hasMore ? runs.slice(0, limit) : runs;

    return { data, nextCursor: hasMore ? data[data.length - 1].id : null, hasMore };
  }

  static async getRunDetails(runId: string, organizationId: string) {
    const run = await prisma.workflowRuns.findUnique({ where: { id: runId } });
    if (!run) throw new AppError("Run not found", 404);

    const workflow = await prisma.workflows.findFirst({
      where: { id: run.workflowId, organizationId },
    });
    if (!workflow) throw new AppError("Run not found", 404);

    const steps = await prisma.workflowRunSteps.findMany({
      where: { runId },
      orderBy: { createdAt: "asc" },
    });

    return { run, steps };
  }

  static async listAllRuns(organizationId: string, options?: {
    limit?: number;
    cursor?: string;
    status?: string;
    workflowId?: string;
  }) {
    const where: Record<string, unknown> = {
      workflow: { organizationId },
    };
    if (options?.status) where.status = options.status;
    if (options?.workflowId) where.workflowId = options.workflowId;

    const limit = Math.min(options?.limit ?? 20, 100);
    const runs = await prisma.workflowRuns.findMany({
      where: where as any,
      take: limit + 1,
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = runs.length > limit;
    const data = hasMore ? runs.slice(0, limit) : runs;

    return { data, nextCursor: hasMore ? data[data.length - 1].id : null, hasMore };
  }

  static async cancelRun(runId: string, organizationId: string) {
    const run = await prisma.workflowRuns.findUnique({ where: { id: runId } });
    if (!run) throw new AppError("Run not found", 404);

    const workflow = await prisma.workflows.findFirst({
      where: { id: run.workflowId, organizationId },
    });
    if (!workflow) throw new AppError("Run not found", 404);

    if (run.status === "COMPLETED" || run.status === "CANCELLED") {
      throw new AppError("Run cannot be cancelled", 400);
    }

    return prisma.workflowRuns.update({
      where: { id: runId },
      data: { status: "CANCELLED", completedAt: new Date() },
    });
  }

  static validateGraph(nodes: GraphNode[], edges: GraphEdge[]): string[] {
    const errors: string[] = [];

    if (nodes.length === 0) {
      errors.push("Workflow must have at least one node");
      return errors;
    }

    const triggerNodes = nodes.filter((n) => n.type === "TRIGGER");
    if (triggerNodes.length === 0) {
      errors.push("Workflow must have a trigger node");
    }
    if (triggerNodes.length > 1) {
      errors.push("Workflow can only have one trigger node");
    }

    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const edge of edges) {
      if (!nodeIds.has(edge.sourceNodeId)) {
        errors.push(`Edge references non-existent source node: ${edge.sourceNodeId}`);
      }
      if (!nodeIds.has(edge.targetNodeId)) {
        errors.push(`Edge references non-existent target node: ${edge.targetNodeId}`);
      }
    }

    const sorted = this.topologicalSort(nodes, edges);
    if (!sorted) {
      errors.push("Workflow contains a cycle");
    }

    const reachable = new Set<string>();
    const queue = [...triggerNodes.map((n) => n.id)];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      for (const edge of edges) {
        if (edge.sourceNodeId === id) queue.push(edge.targetNodeId);
      }
    }

    for (const node of nodes) {
      if (!reachable.has(node.id)) {
        errors.push(`Node "${node.label}" is unreachable from the trigger`);
      }
    }

    return errors;
  }
}
