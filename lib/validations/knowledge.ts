import { z } from "zod";

export const createKnowledgeBaseSchema = z.object({
  name: z.string().min(1, "Name is required").max(128, "Name is too long"),
  description: z.string().optional().nullable(),
  chunkingStrategy: z.string().optional().nullable(),
  chunkSize: z.number().int().optional().default(500),
  chunkOverlap: z.number().int().optional().default(50),
  embeddingModel: z.string().optional().nullable(),
});

export const updateKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().optional().nullable(),
  chunkingStrategy: z.string().optional().nullable(),
  chunkSize: z.number().int().optional(),
  chunkOverlap: z.number().int().optional(),
  embeddingModel: z.string().optional().nullable(),
});

export const uploadDocumentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  source: z.string().optional().nullable(),
  sourceType: z.string().min(1),
  content: z.string().min(1, "Content is required"),
  fileSize: z.number().int().optional().nullable(),
  fileType: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const searchKnowledgeSchema = z.object({
  query: z.string().min(1, "Query is required"),
  knowledgeBaseId: z.string().uuid().optional(),
  limit: z.number().int().optional().default(10),
  threshold: z.number().min(0).max(1).optional().default(0.7),
});

export type CreateKnowledgeBaseInput = z.infer<typeof createKnowledgeBaseSchema>;
export type UpdateKnowledgeBaseInput = z.infer<typeof updateKnowledgeBaseSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type SearchKnowledgeInput = z.infer<typeof searchKnowledgeSchema>;
