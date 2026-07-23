import { z } from "zod";

export const checkoutSchema = z.object({
  plan: z.enum(["starter", "pro"]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
