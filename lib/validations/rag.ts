import { z } from "zod";

export const ragQuerySchema = z.object({
  query: z.string().min(1, "Query is required"),
  knowledgeBaseIds: z.array(z.string().uuid()).min(1, "At least one knowledge base is required"),
  provider: z.string().optional().default("openai"),
  model: z.string().optional().default("gpt-4"),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().optional(),
  systemPrompt: z.string().optional().nullable(),
  topK: z.number().int().optional().default(5),
  minScore: z.number().min(0).max(1).optional().default(0.7),
  includeCitations: z.boolean().optional().default(true),
});

export const ragQueryResult = z.object({
  answer: z.string(),
  citations: z.array(z.object({
    chunkId: z.string(),
    content: z.string(),
    score: z.number(),
    documentTitle: z.string(),
    source: z.string(),
    metadata: z.record(z.unknown()).optional(),
  })).optional(),
  usage: z.object({
    promptTokens: z.number().int(),
    completionTokens: z.number().int(),
    totalTokens: z.number().int(),
  }),
  latency: z.number().int(),
});

export type RagQueryInput = z.infer<typeof ragQuerySchema>;
export type RagQueryResult = z.infer<typeof ragQueryResult>;
