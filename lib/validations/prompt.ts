import { z } from "zod";

const variableSchema = z.object({
  name: z.string().min(1),
  label: z.string().optional(),
  type: z.enum(["STRING", "NUMBER", "BOOLEAN", "SELECT", "TEXTAREA"]),
  defaultValue: z.string().optional().nullable(),
  required: z.boolean().default(false),
  options: z.array(z.string()),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

export const createPromptSchema = z.object({
  name: z.string().min(1, "Name is required").max(128, "Name is too long"),
  description: z.string().optional().nullable(),
  content: z.string().min(1, "Content is required"),
  categoryId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).max(10).optional(),
  variables: z.array(variableSchema).optional(),
});

export const updatePromptSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().optional().nullable(),
  content: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).max(10).optional(),
  variables: z.array(variableSchema).optional(),
});

export const runPromptSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  topP: z.number().min(0).max(1).optional().default(1),
  maxTokens: z.number().int().min(1).max(128000).optional().default(2048),
  systemPrompt: z.string().optional().nullable(),
  userPrompt: z.string().min(1),
  variables: z.record(z.string()).optional(),
});

export const comparePromptSchema = z.object({
  runs: z.array(runPromptSchema)
    .min(2, "At least 2 prompts are required")
    .max(5, "At most 5 prompts are allowed"),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  color: z.string().optional().default("#6366f1"),
  icon: z.string().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export type CreatePromptInput = z.infer<typeof createPromptSchema>;
export type UpdatePromptInput = z.infer<typeof updatePromptSchema>;
export type RunPromptInput = z.infer<typeof runPromptSchema>;
export type ComparePromptInput = z.infer<typeof comparePromptSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type VariableInput = z.infer<typeof variableSchema>;
