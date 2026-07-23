import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";

export class PolicyManager {
  static async get(orgId: string): Promise<any> {
    let policy = null;
    try {
      policy = await prisma.securityPolicies.findUnique({ where: { organizationId: orgId } });
    } catch {
      return null;
    }
    if (!policy) {
      try {
        policy = await prisma.securityPolicies.create({ data: { organizationId: orgId } });
      } catch {
        return null;
      }
    }
    return policy;
  }

  static async update(orgId: string, data: any): Promise<any> {
    const existing = await prisma.securityPolicies.findUnique({ where: { organizationId: orgId } });
    if (!existing) {
      return prisma.securityPolicies.create({ data: { organizationId: orgId, ...data } });
    }
    return prisma.securityPolicies.update({ where: { organizationId: orgId }, data });
  }

  static async validatePassword(password: string, orgId?: string): Promise<{ valid: boolean; errors: string[] }> {
    const policy = orgId ? await this.get(orgId) : null;
    const minLen = policy?.minPasswordLength ?? 8;
    const errors: string[] = [];

    if (password.length < minLen) errors.push(`Must be at least ${minLen} characters`);
    if (policy?.requireUppercase && !/[A-Z]/.test(password)) errors.push("Must contain uppercase letter");
    if (policy?.requireLowercase && !/[a-z]/.test(password)) errors.push("Must contain lowercase letter");
    if (policy?.requireNumbers && !/[0-9]/.test(password)) errors.push("Must contain number");
    if (policy?.requireSymbols && !/[^A-Za-z0-9]/.test(password)) errors.push("Must contain symbol");

    return { valid: errors.length === 0, errors };
  }

  static async isIpAllowed(ip: string, orgId?: string): Promise<boolean> {
    if (!orgId) return true;
    try {
      const policy = await this.get(orgId);
      if (!policy?.allowedIps?.length) return true;
      return policy.allowedIps.includes(ip) || policy.allowedIps.some((cidr: string) => this.ipInCidr(ip, cidr));
    } catch {
      return true;
    }
  }

  static async isCountryAllowed(country: string, orgId?: string): Promise<boolean> {
    if (!orgId || !country) return true;
    try {
      const policy = await this.get(orgId);
      if (!policy?.allowedCountries?.length) return true;
      return policy.allowedCountries.includes(country);
    } catch {
      return true;
    }
  }

  static async isDomainTrusted(email: string, orgId?: string): Promise<boolean> {
    if (!orgId || !email) return true;
    const policy = await this.get(orgId);
    if (!policy.trustedDomains?.length) return true;
    const domain = email.split("@")[1];
    return policy.trustedDomains.includes(domain);
  }

  private static ipInCidr(ip: string, cidr: string): boolean {
    try {
      const [range, bits = "32"] = cidr.split("/");
      const mask = ~(2 ** (32 - parseInt(bits)) - 1);
      const ipNum = ip.split(".").reduce((a, b) => (a << 8) + parseInt(b), 0);
      const rangeNum = range.split(".").reduce((a, b) => (a << 8) + parseInt(b), 0);
      return (ipNum & mask) === (rangeNum & mask);
    } catch { return false; }
  }
}
