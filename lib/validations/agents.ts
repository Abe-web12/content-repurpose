import { z } from "zod";

export const createAgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(128, "Name is too long"),
  description: z.string().max(512).optional().nullable(),
  systemPrompt: z.string().optional().nullable(),
  model: z.string().optional().default("gpt-4"),
  provider: z.string().optional().default("openai"),
  temperature: z.number().optional().default(0.7),
  maxTokens: z.number().optional().default(4096),
  visibility: z.enum(["PRIVATE", "ORGANIZATION", "PUBLIC"]).optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(512).optional().nullable(),
  systemPrompt: z.string().optional().nullable(),
  model: z.string().optional(),
  provider: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  visibility: z.enum(["PRIVATE", "ORGANIZATION", "PUBLIC"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED", "ERROR"]).optional(),
});

export const chatSchema = z.object({
  message: z.string().min(1, "Message is required"),
  conversationId: z.string().optional(),
});

export const memorySchema = z.object({
  key: z.string().min(1, "Key is required"),
  content: z.string().min(1, "Content is required"),
  type: z.string().optional().default("SHORT_TERM"),
  summary: z.string().optional().nullable(),
  score: z.number().optional().default(0),
});

export const knowledgeBaseSchema = z.object({
  name: z.string().min(1, "Name is required").max(128, "Name is too long"),
  description: z.string().optional().nullable(),
  chunkSize: z.number().optional().default(500),
  chunkOverlap: z.number().optional().default(50),
});

export const documentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  source: z.string().min(1, "Source is required"),
  sourceType: z.string().min(1, "Source type is required"),
  content: z.string().min(1, "Content is required"),
});

export const toolSchema = z.object({
  type: z.string().min(1, "Type is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  config: z.record(z.unknown()).optional(),
});

export const runSchema = z.object({
  input: z.record(z.unknown()).optional(),
});

export const scheduleSchema = z.object({
  cron: z.string().min(1, "Cron expression is required"),
  input: z.record(z.unknown()).optional(),
});

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  priority: z.number().optional().default(0),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type ChatInput = z.infer<typeof chatSchema>;
export type MemoryInput = z.infer<typeof memorySchema>;
export type KnowledgeBaseInput = z.infer<typeof knowledgeBaseSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
export type ToolInput = z.infer<typeof toolSchema>;
export type RunInput = z.infer<typeof runSchema>;
export type ScheduleInput = z.infer<typeof scheduleSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
