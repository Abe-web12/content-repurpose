import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";
import { hasPermission, Permission } from "@/lib/organizations/permissions";
import { randomBytes } from "crypto";

export class DomainManager {
  static async get(orgId: string, userId: string): Promise<{ domain: string | null; domainVerified: boolean; domainVerificationCode: string | null; sslStatus: string | null; isPrimaryDomain: boolean }> {
    const member = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!member) throw new AppError("Not a member", 403);

    const org = await prisma.organizations.findUnique({
      where: { id: orgId },
      select: { domain: true, domainVerified: true, domainVerificationCode: true, sslStatus: true, isPrimaryDomain: true },
    });
    if (!org) throw new AppError("Organization not found", 404);

    return org;
  }

  static async update(orgId: string, userId: string, domain: string): Promise<any> {
    const member = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!member) throw new AppError("Not a member", 403);
    if (!hasPermission(member.role, Permission.SETTINGS_MANAGE)) throw new AppError("Insufficient permissions", 403);

    const sanitizedDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const verificationCode = randomBytes(16).toString("hex");

    const existing = await prisma.organizations.findFirst({ where: { domain: sanitizedDomain } });
    if (existing && existing.id !== orgId) throw new AppError("Domain is already in use by another organization", 409);

    await prisma.organizations.update({
      where: { id: orgId },
      data: {
        domain: sanitizedDomain,
        domainVerified: false,
        domainVerificationCode: verificationCode,
        sslStatus: "pending",
      },
    });

    return { domain: sanitizedDomain, domainVerified: false, domainVerificationCode: verificationCode, sslStatus: "pending" };
  }

  static async remove(orgId: string, userId: string): Promise<void> {
    const member = await prisma.organizationMembers.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!member) throw new AppError("Not a member", 403);
    if (!hasPermission(member.role, Permission.SETTINGS_MANAGE)) throw new AppError("Insufficient permissions", 403);

    await prisma.organizations.update({
      where: { id: orgId },
      data: { domain: null, domainVerified: false, domainVerificationCode: null, sslStatus: null, isPrimaryDomain: false },
    });
  }

  static async verify(orgId: string): Promise<boolean> {
    const org = await prisma.organizations.findUnique({ where: { id: orgId } });
    if (!org?.domain || !org.domainVerificationCode) return false;

    const verified = await this.checkDNSRecord(org.domain, org.domainVerificationCode);
    if (verified) {
      await prisma.organizations.update({
        where: { id: orgId },
        data: { domainVerified: true, sslStatus: "active" },
      });
    }
    return verified;
  }

  private static async checkDNSRecord(domain: string, expectedCode: string): Promise<boolean> {
    try {
      const dns = require("dns").promises;
      const records = await dns.resolveTxt(domain);
      const txtRecord = records.flat().find((r: string) => r.includes(expectedCode));
      return !!txtRecord;
    } catch {
      return false;
    }
  }

  static getDNSInstructions(domain: string, verificationCode: string): Array<{ type: string; name: string; value: string; purpose: string }> {
    return [
      { type: "TXT", name: `_repurposeai-verify.${domain}`, value: `repurposeai-verification=${verificationCode}`, purpose: "Domain ownership verification" },
      { type: "CNAME", name: domain, value: "app.repurpurposeai.com", purpose: "Route traffic to RepurposeAI" },
      { type: "TXT", name: domain, value: "v=spf1 include:spf.resend.com ~all", purpose: "Email sending authentication" },
    ];
  }

  static async getBrandingForDomain(domain: string): Promise<any> {
    const org = await prisma.organizations.findFirst({
      where: { domain, domainVerified: true },
      select: {
        id: true, name: true, logo: true, logoLight: true, logoDark: true,
        favicon: true, brandColor: true, secondaryColor: true, accentColor: true,
        fontFamily: true, emailBrandingEnabled: true, emailHeaderHtml: true, emailFooterHtml: true,
      },
    });
    return org;
  }
}
