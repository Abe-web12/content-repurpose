import { z } from "zod"

export const createVoiceProfileSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(30, "Name must be less than 30 characters"),
  description: z
    .string()
    .max(200, "Description must be less than 200 characters")
    .optional(),
})

export const schedulePostSchema = z.object({
  platform: z.enum(["LINKEDIN", "TWITTER"], {
    errorMap: () => ({ message: "Platform must be either LINKEDIN or TWITTER" }),
  }),
  content: z
    .string()
    .min(10, "Content must be at least 10 characters")
    .max(3000, "Content must be less than 3000 characters"),
  scheduledAt: z
    .string()
    .datetime({ message: "scheduledAt must be a valid ISO date string" })
    .refine((val) => new Date(val) > new Date(), {
      message: "scheduledAt must be a future date",
    }),
})

export type CreateVoiceProfileInput = z.infer<typeof createVoiceProfileSchema>
export type SchedulePostInput = z.infer<typeof schedulePostSchema>
