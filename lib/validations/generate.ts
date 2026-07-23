import { z } from "zod";

export const extractSchema = z.object({
  input: z.string().min(1, "Input is required"),
  input_type: z.enum(["youtube_url", "blog_url", "podcast_url", "raw_text"]),
});

export const generateSchema = z.object({
  content: z.string().min(50, "Content must be at least 50 characters"),
  output_format: z.enum(["linkedin_post", "linkedin_carousel", "twitter_thread"]),
  voice_profile_id: z.string().uuid().nullable().optional(),
});

export type ExtractInput = z.infer<typeof extractSchema>;
export type GenerateInput = z.infer<typeof generateSchema>;
