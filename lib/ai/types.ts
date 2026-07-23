export interface BrandKitContext {
  company_name: string;
  company_description?: string | null;
  target_audience?: string | null;
  brand_voice: string;
  brand_colors: string[];
}

export function buildBrandKitSection(brandKit: BrandKitContext | null): string {
  if (!brandKit || !brandKit.company_name) return "";
  return `
BRAND CONTEXT:
- Company: ${brandKit.company_name}
${brandKit.company_description ? `- Description: ${brandKit.company_description}` : ""}
${brandKit.target_audience ? `- Target Audience: ${brandKit.target_audience}` : ""}
- Brand Voice: ${brandKit.brand_voice || "Professional"}
${brandKit.brand_colors.length > 0 ? `- Brand Colors: ${brandKit.brand_colors.join(", ")}` : ""}

IMPORTANT: All generated content MUST align with the brand voice and target audience described above.
Write as if you are the company itself communicating with its audience.`;
}
