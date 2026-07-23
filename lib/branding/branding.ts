import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";
import { hasPermission, Permission } from "@/lib/organizations/permissions";
import { ThemeEngine } from "./theme-engine";

export interface BrandingData {
  logo: string | null;
  logoLight: string | null;
  logoDark: string | null;
  favicon: string | null;
  brandColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  customFont: string | null;
  fontFamily: string | null;
  emailBrandingEnabled: boolean;
  emailHeaderHtml: string | null;
  emailFooterHtml: string | null;
  loadingScreenHtml: string | null;
}

export class BrandingManager {
  static async get(orgId: string, userId: string): Promise<BrandingData> {
    const member = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!member) throw new AppError("Not a member", 403);

    const org = await prisma.organizations.findUnique({ where: { id: orgId } });
    if (!org) throw new AppError("Organization not found", 404);

    return {
      logo: org.logo,
      logoLight: org.logoLight,
      logoDark: org.logoDark,
      favicon: org.favicon,
      brandColor: org.brandColor,
      secondaryColor: org.secondaryColor,
      accentColor: org.accentColor,
      customFont: org.customFont,
      fontFamily: org.fontFamily,
      emailBrandingEnabled: org.emailBrandingEnabled,
      emailHeaderHtml: org.emailHeaderHtml,
      emailFooterHtml: org.emailFooterHtml,
      loadingScreenHtml: org.loadingScreenHtml,
    };
  }

  static async update(orgId: string, userId: string, data: Partial<BrandingData>): Promise<BrandingData> {
    const member = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!member) throw new AppError("Not a member", 403);
    if (!hasPermission(member.role, Permission.BRAND_MANAGE)) throw new AppError("Insufficient permissions", 403);

    const updateData: any = {};
    if (data.logo !== undefined) updateData.logo = data.logo;
    if (data.logoLight !== undefined) updateData.logoLight = data.logoLight;
    if (data.logoDark !== undefined) updateData.logoDark = data.logoDark;
    if (data.favicon !== undefined) updateData.favicon = data.favicon;
    if (data.brandColor !== undefined) updateData.brandColor = data.brandColor;
    if (data.secondaryColor !== undefined) updateData.secondaryColor = data.secondaryColor;
    if (data.accentColor !== undefined) updateData.accentColor = data.accentColor;
    if (data.customFont !== undefined) updateData.customFont = data.customFont;
    if (data.fontFamily !== undefined) updateData.fontFamily = data.fontFamily;
    if (data.emailBrandingEnabled !== undefined) updateData.emailBrandingEnabled = data.emailBrandingEnabled;
    if (data.emailHeaderHtml !== undefined) updateData.emailHeaderHtml = data.emailHeaderHtml;
    if (data.emailFooterHtml !== undefined) updateData.emailFooterHtml = data.emailFooterHtml;
    if (data.loadingScreenHtml !== undefined) updateData.loadingScreenHtml = data.loadingScreenHtml;

    await prisma.organizations.update({ where: { id: orgId }, data: updateData });
    await ThemeEngine.invalidateCache(orgId);

    return this.get(orgId, userId);
  }

  static async reset(orgId: string, userId: string): Promise<BrandingData> {
    const member = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!member) throw new AppError("Not a member", 403);
    if (!hasPermission(member.role, Permission.BRAND_MANAGE)) throw new AppError("Insufficient permissions", 403);
    if (member.role !== "OWNER" && member.role !== "ADMIN") throw new AppError("Only owners and admins can reset branding", 403);

    await prisma.organizations.update({
      where: { id: orgId },
      data: {
        logo: null,
        logoLight: null,
        logoDark: null,
        favicon: null,
        brandColor: null,
        secondaryColor: null,
        accentColor: null,
        customFont: null,
        fontFamily: null,
        emailBrandingEnabled: false,
        emailHeaderHtml: null,
        emailFooterHtml: null,
        loadingScreenHtml: null,
      },
    });

    await ThemeEngine.invalidateCache(orgId);
    return this.get(orgId, userId);
  }
}
