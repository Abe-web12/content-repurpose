import { z } from "zod";

export const voiceProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be under 50 characters"),
  description: z
    .string()
    .max(300, "Description must be under 300 characters")
    .nullable()
    .optional(),
  tone: z.enum(["formal", "casual", "witty", "authoritative", "friendly"]),
  example_posts: z
    .array(z.string().min(20, "Each example must be at least 20 characters"))
    .min(1, "Add at least one writing example")
    .max(5, "Maximum 5 examples"),
  is_default: z.boolean().optional(),
  is_favorite: z.boolean().optional(),
});

export type VoiceProfileInput = z.infer<typeof voiceProfileSchema>;
