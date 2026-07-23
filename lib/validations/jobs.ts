import { z } from "zod";

export const createJobSchema = z.object({
  content: z.string().min(50, "Content must be at least 50 characters"),
  output_format: z.enum(["linkedin_post", "linkedin_carousel", "twitter_thread"]),
  voice_profile_id: z.string().uuid().nullable().optional(),
  brand_kit_id: z.string().uuid().nullable().optional(),
  priority: z.number().int().min(0).max(10).optional(),
});

export const jobQuerySchema = z.object({
  status: z.enum(["QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type JobQueryInput = z.infer<typeof jobQuerySchema>;
