import { z } from "zod";

const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const brandKitSchema = z.object({
  company_name: z.string().max(100, "Company name must be under 100 characters").default(""),
  company_description: z.string().max(2000, "Description must be under 2000 characters").optional().default(""),
  target_audience: z.string().max(1000, "Target audience must be under 1000 characters").optional().default(""),
  brand_colors: z
    .array(z.string().regex(hexColorRegex, "Each color must be a valid hex code"))
    .max(10, "Maximum 10 brand colors")
    .default([]),
  brand_voice: z.string().max(1000, "Brand voice must be under 1000 characters").default(""),
  logo_url: z.string().url("Must be a valid URL").or(z.literal("")).default(""),
});

export type BrandKitInput = z.infer<typeof brandKitSchema>;
