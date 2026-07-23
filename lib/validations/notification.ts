import { z } from "zod";

export const createNotificationSchema = z.object({
  type: z.string().default("info"),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  link: z.string().optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
