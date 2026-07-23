import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export interface BrandingTheme {
  name: string;
  logo: string | null;
  logoLight: string | null;
  logoDark: string | null;
  favicon: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  brandColor: string | null;
}

const DEFAULT_THEME: BrandingTheme = {
  name: "Default",
  logo: null,
  logoLight: null,
  logoDark: null,
  favicon: null,
  primaryColor: "#6366f1",
  secondaryColor: "#4f46e5",
  accentColor: "#10b981",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  brandColor: null,
};

const THEME_CACHE_PREFIX = "org:theme:";
const THEME_CACHE_TTL = 3600;

export class ThemeEngine {
  static async getTheme(orgId: string): Promise<BrandingTheme> {
    const cached = await redis.get(`${THEME_CACHE_PREFIX}${orgId}`);
    if (cached && typeof cached === "object") return cached as BrandingTheme;

    const org = await prisma.organizations.findUnique({ where: { id: orgId } });
    if (!org) return DEFAULT_THEME;

    const theme: BrandingTheme = {
      name: org.name,
      logo: org.logo,
      logoLight: org.logoLight,
      logoDark: org.logoDark,
      favicon: org.favicon,
      primaryColor: org.brandColor || DEFAULT_THEME.primaryColor,
      secondaryColor: org.secondaryColor || DEFAULT_THEME.secondaryColor,
      accentColor: org.accentColor || DEFAULT_THEME.accentColor,
      fontFamily: org.fontFamily || DEFAULT_THEME.fontFamily,
      brandColor: org.brandColor,
    };

    await redis.set(`${THEME_CACHE_PREFIX}${orgId}`, theme, { ex: THEME_CACHE_TTL });
    return theme;
  }

  static generateCSS(theme: BrandingTheme): string {
    return `
:root {
  --brand-primary: ${theme.primaryColor};
  --brand-secondary: ${theme.secondaryColor};
  --brand-accent: ${theme.accentColor};
  --brand-font: ${theme.fontFamily};
}
    `.trim();
  }

  static async invalidateCache(orgId: string): Promise<void> {
    await redis.del(`${THEME_CACHE_PREFIX}${orgId}`);
  }

  static getDefaultTheme(): BrandingTheme {
    return { ...DEFAULT_THEME };
  }
}
