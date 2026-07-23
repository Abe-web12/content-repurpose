import { z } from "zod";

export const templateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(500).optional().default(""),
  category: z.string().default("general"),
  platform: z.string().default("linkedin"),
  content: z.string().min(1, "Content is required"),
  isCustom: z.boolean().default(false),
});

export type TemplateInput = z.infer<typeof templateSchema>;
