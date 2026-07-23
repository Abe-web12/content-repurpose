import { z } from "zod";

export const webhookSchema = z.object({
  url: z.string().url("Must be a valid URL").refine(
    (val) => val.startsWith("http://") || val.startsWith("https://"),
    { message: "URL must use http or https protocol" },
  ),
  secret: z.string().max(500, "Secret must be under 500 characters").optional().default(""),
  is_active: z.boolean().default(true),
  trigger_events: z.array(z.enum(["generation.completed", "schedule.created", "scheduled.posted", "content.published"])).min(1, "Select at least one event"),
});

export const webhookTestSchema = z.object({
  url: z.string().url("Must be a valid URL").refine(
    (val) => val.startsWith("http://") || val.startsWith("https://"),
    { message: "URL must use http or https protocol" },
  ),
  secret: z.string().optional().default(""),
});

export type WebhookInput = z.infer<typeof webhookSchema>;
export type WebhookTestInput = z.infer<typeof webhookTestSchema>;
