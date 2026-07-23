import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";
import type { CreateWorkflowInput, UpdateWorkflowInput, SaveWorkflowNodesInput } from "@/lib/validations/workflow";

class AuditService {
  static async log(workflowId: string, userId: string, action: string, details?: Record<string, unknown>) {
    try {
      await prisma.workflowAuditLogs.create({
        data: { workflowId, userId, action, details: (details ?? {}) as any },
      });
    } catch {
      // Non-critical; don't throw
    }
  }
}

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export class WorkflowService {
  static async list(organizationId: string, options?: {
    status?: string;
    folderId?: string;
    search?: string;
    limit?: number;
    cursor?: string;
    includeDrafts?: boolean;
  }) {
    const where: Record<string, unknown> = {
      organizationId,
      deletedAt: null,
    };

    if (options?.status) where.status = options.status;
    if (options?.folderId !== undefined) {
      where.folderId = options.folderId || null;
    }
    if (options?.search) {
      where.name = { contains: options.search, mode: "insensitive" };
    }
    if (!options?.includeDrafts) {
      where.status = { not: "ARCHIVED" };
    }

    const limit = Math.min(options?.limit ?? 50, 100);
    const workflows = await prisma.workflows.findMany({
      where,
      take: limit + 1,
      ...(options?.cursor ? {
        cursor: { id: options.cursor },
        skip: 1,
      } : {}),
      orderBy: { updatedAt: "desc" },
    });

    const hasMore = workflows.length > limit;
    const data = hasMore ? workflows.slice(0, limit) : workflows;

    return {
      data,
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }

  static async getById(workflowId: string, organizationId: string) {
    const workflow = await prisma.workflows.findFirst({
      where: { id: workflowId, organizationId, deletedAt: null },
    });
    if (!workflow) throw new AppError("Workflow not found", 404);
    return workflow;
  }

  static async create(input: CreateWorkflowInput & { organizationId: string; userId: string }) {
    const workflow = await prisma.workflows.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        organizationId: input.organizationId,
        createdById: input.userId,
        updatedById: input.userId,
        folderId: input.folderId ?? null,
        tags: input.tags ?? [],
      },
    });

    await AuditService.log(workflow.id, input.userId, "workflow.created", { name: workflow.name });
    return workflow;
  }

  static async update(workflowId: string, organizationId: string, userId: string, input: UpdateWorkflowInput) {
    const workflow = await this.getById(workflowId, organizationId);

    const data: Record<string, unknown> = {
      updatedById: userId,
    };
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.folderId !== undefined) data.folderId = input.folderId;
    if (input.tags !== undefined) data.tags = input.tags;

    const updated = await prisma.workflows.update({
      where: { id: workflowId },
      data,
    });

    if (input.nodes && input.edges) {
      await this.saveNodes(workflowId, { nodes: input.nodes, edges: input.edges });
    }

    await AuditService.log(workflowId, userId, "workflow.updated", { changes: Object.keys(input) });
    return updated;
  }

  static async saveNodes(workflowId: string, input: SaveWorkflowNodesInput) {
    await prisma.$transaction(async (tx) => {
      await tx.workflowNodes.deleteMany({ where: { workflowId } });
      await tx.workflowEdges.deleteMany({ where: { workflowId } });

      for (const node of input.nodes) {
        await tx.workflowNodes.create({
          data: {
            id: node.id,
            workflowId,
            type: node.type as any,
            label: node.label,
            config: (node.config ?? {}) as any,
            positionX: node.positionX,
            positionY: node.positionY,
            width: node.width ?? 200,
            height: node.height ?? 100,
            metadata: (node.metadata ?? {}) as any,
          },
        });
      }

      for (const edge of input.edges) {
        await tx.workflowEdges.create({
          data: {
            id: edge.id,
            workflowId,
            sourceNodeId: edge.sourceNodeId,
            targetNodeId: edge.targetNodeId,
            sourceHandle: edge.sourceHandle ?? null,
            targetHandle: edge.targetHandle ?? null,
            label: edge.label ?? null,
            config: (edge.config ?? {}) as any,
          },
        });
      }
    });
  }

  static async publish(workflowId: string, organizationId: string, userId: string) {
    const workflow = await this.getById(workflowId, organizationId);

    const nodes = await prisma.workflowNodes.findMany({
      where: { workflowId, deletedAt: null },
    });
    const edges = await prisma.workflowEdges.findMany({
      where: { workflowId, deletedAt: null },
    });

    const newVersion = workflow.version + 1;

    const [version] = await prisma.$transaction([
      prisma.workflowVersions.create({
        data: {
          workflowId,
          version: newVersion,
          nodes: nodes as any,
          edges: edges as any,
          createdById: userId,
        },
      }),
      prisma.workflows.update({
        where: { id: workflowId },
        data: {
          status: "PUBLISHED",
          version: newVersion,
          currentVersionId: undefined,
          updatedById: userId,
        },
      }),
    ]);

    await AuditService.log(workflowId, userId, "workflow.published", { version: newVersion });
    return { workflow: null, version };
  }

  static async archive(workflowId: string, organizationId: string, userId: string) {
    await this.getById(workflowId, organizationId);
    const updated = await prisma.workflows.update({
      where: { id: workflowId },
      data: { status: "ARCHIVED", updatedById: userId },
    });
    await AuditService.log(workflowId, userId, "workflow.archived", {});
    return updated;
  }

  static async duplicate(workflowId: string, organizationId: string, userId: string) {
    const original = await this.getById(workflowId, organizationId);
    const nodes = await prisma.workflowNodes.findMany({
      where: { workflowId, deletedAt: null },
    });
    const edges = await prisma.workflowEdges.findMany({
      where: { workflowId, deletedAt: null },
    });

    const duplicate = await prisma.workflows.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        organizationId,
        createdById: userId,
        updatedById: userId,
        tags: original.tags,
        status: "DRAFT",
      },
    });

    const nodeIdMap = new Map<string, string>();
    const nodeData = nodes.map((node) => {
      const newId = generateId();
      nodeIdMap.set(node.id, newId);
      return {
        id: newId,
        workflowId: duplicate.id,
        type: node.type,
        label: node.label,
        config: node.config as any,
        positionX: node.positionX + 50,
        positionY: node.positionY + 50,
        width: node.width,
        height: node.height,
        metadata: node.metadata as any,
      };
    });

    const edgeData = edges.map((edge) => ({
      workflowId: duplicate.id,
      sourceNodeId: nodeIdMap.get(edge.sourceNodeId) ?? edge.sourceNodeId,
      targetNodeId: nodeIdMap.get(edge.targetNodeId) ?? edge.targetNodeId,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: edge.label,
      config: edge.config as any,
    }));

    await prisma.$transaction([
      prisma.workflowNodes.createMany({ data: nodeData }),
      prisma.workflowEdges.createMany({ data: edgeData }),
    ]);

    await AuditService.log(duplicate.id, userId, "workflow.duplicated", { sourceId: workflowId });
    return duplicate;
  }

  static async softDelete(workflowId: string, organizationId: string, userId: string) {
    await this.getById(workflowId, organizationId);
    await prisma.workflows.update({
      where: { id: workflowId },
      data: { deletedAt: new Date(), updatedById: userId },
    });
    await AuditService.log(workflowId, userId, "workflow.deleted", {});
  }

  static async getNodes(workflowId: string, organizationId: string) {
    await this.getById(workflowId, organizationId);
    const [nodes, edges] = await Promise.all([
      prisma.workflowNodes.findMany({ where: { workflowId, deletedAt: null } }),
      prisma.workflowEdges.findMany({ where: { workflowId, deletedAt: null } }),
    ]);
    return { nodes, edges };
  }

  static async getVersions(workflowId: string, organizationId: string) {
    await this.getById(workflowId, organizationId);
    return prisma.workflowVersions.findMany({
      where: { workflowId },
      orderBy: { version: "desc" },
    });
  }

  static async rollback(workflowId: string, organizationId: string, userId: string, version: number) {
    await this.getById(workflowId, organizationId);
    const versionData = await prisma.workflowVersions.findUnique({
      where: { workflowId_version: { workflowId, version } },
    });
    if (!versionData) throw new AppError("Version not found", 404);

    const nodes = (versionData.nodes as any[]) ?? [];
    const edges = (versionData.edges as any[]) ?? [];

    await this.saveNodes(workflowId, {
      nodes: nodes.map((n: any) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        config: n.config,
        positionX: n.positionX,
        positionY: n.positionY,
        width: n.width,
        height: n.height,
        metadata: n.metadata,
      })),
      edges: edges.map((e: any) => ({
        id: e.id,
        sourceNodeId: e.sourceNodeId,
        targetNodeId: e.targetNodeId,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: e.label,
        config: e.config,
      })),
    });

    await prisma.workflows.update({
      where: { id: workflowId },
      data: { version, updatedById: userId, status: "DRAFT" },
    });

    await AuditService.log(workflowId, userId, "workflow.rollback", { version });
  }
}
