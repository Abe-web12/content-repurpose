import { z } from "zod";

export const createWorkflowSchema = z.object({
  name: z.string().min(1, "Name is required").max(128, "Name is too long"),
  description: z.string().max(512).optional().nullable(),
  folderId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().max(32)).max(10).optional(),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(512).optional().nullable(),
  folderId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().max(32)).max(10).optional(),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    label: z.string(),
    config: z.record(z.unknown()).optional(),
    positionX: z.number(),
    positionY: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
  })).optional(),
  edges: z.array(z.object({
    id: z.string(),
    sourceNodeId: z.string(),
    targetNodeId: z.string(),
    sourceHandle: z.string().optional().nullable(),
    targetHandle: z.string().optional().nullable(),
    label: z.string().optional().nullable(),
  })).optional(),
});

export const saveWorkflowNodesSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    label: z.string(),
    config: z.record(z.unknown()).optional(),
    positionX: z.number(),
    positionY: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
    metadata: z.record(z.unknown()).optional(),
  })).min(1, "Workflow must have at least one node"),
  edges: z.array(z.object({
    id: z.string(),
    sourceNodeId: z.string(),
    targetNodeId: z.string(),
    sourceHandle: z.string().optional().nullable(),
    targetHandle: z.string().optional().nullable(),
    label: z.string().optional().nullable(),
    config: z.record(z.unknown()).optional(),
  })),
});

export const runWorkflowSchema = z.object({
  triggerData: z.record(z.unknown()).optional(),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
export type SaveWorkflowNodesInput = z.infer<typeof saveWorkflowNodesSchema>;
export type RunWorkflowInput = z.infer<typeof runWorkflowSchema>;
