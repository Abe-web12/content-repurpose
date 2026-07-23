import { prisma } from "@/lib/prisma";

export class ThreatDetector {
  static async record(threatType: string, data: { organizationId?: string; userId?: string; severity?: string; ipAddress?: string; userAgent?: string; country?: string; details?: any }): Promise<void> {
    await prisma.threatEvents.create({
      data: {
        threatType,
        severity: data.severity || "low",
        organizationId: data.organizationId,
        userId: data.userId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        country: data.country,
        details: data.details ? JSON.parse(JSON.stringify(data.details)) : null,
      },
    });
  }

  static async detectBruteForce(userId: string, maxAttempts = 5, windowMinutes = 15): Promise<boolean> {
    const since = new Date(Date.now() - windowMinutes * 60000);
    const recentFailed = await prisma.ssoLoginEvents.count({
      where: { userId, success: false, createdAt: { gte: since } },
    });
    return recentFailed >= maxAttempts;
  }

  static async detectImpossibleTravel(userId: string, newCountry: string, thresholdMinutes = 60): Promise<boolean> {
    const lastLocation = await prisma.threatEvents.findFirst({
      where: { userId, country: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { country: true, createdAt: true },
    });
    if (!lastLocation?.country || !newCountry) return false;
    if (lastLocation.country === newCountry) return false;
    const minutesSince = (Date.now() - lastLocation.createdAt.getTime()) / 60000;
    return minutesSince < thresholdMinutes;
  }

  static async getThreats(orgId: string, options: { limit?: number; offset?: number; severity?: string; resolved?: boolean } = {}): Promise<any[]> {
    const where: any = { organizationId: orgId };
    if (options.severity) where.severity = options.severity;
    if (options.resolved !== undefined) where.resolved = options.resolved;

    return prisma.threatEvents.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    });
  }

  static async resolve(threatId: string): Promise<void> {
    await prisma.threatEvents.update({ where: { id: threatId }, data: { resolved: true, resolvedAt: new Date() } });
  }

  static async getStats(): Promise<{ total: number; critical: number; high: number; medium: number; low: number; resolved: number }> {
    const [total, critical, high, medium, low, resolved] = await Promise.all([
      prisma.threatEvents.count(),
      prisma.threatEvents.count({ where: { severity: "critical", resolved: false } }),
      prisma.threatEvents.count({ where: { severity: "high", resolved: false } }),
      prisma.threatEvents.count({ where: { severity: "medium", resolved: false } }),
      prisma.threatEvents.count({ where: { severity: "low", resolved: false } }),
      prisma.threatEvents.count({ where: { resolved: true } }),
    ]);
    return { total, critical, high, medium, low, resolved };
  }

  static async getSecurityScore(orgId: string): Promise<{ score: number; factors: Array<{ name: string; passed: boolean; weight: number }> }> {
    const policy = await prisma.securityPolicies.findUnique({ where: { organizationId: orgId } });
    const mfaCount = await prisma.mfaMethods.count({ where: { confirmed: true } });
    const threats = await prisma.threatEvents.count({ where: { organizationId: orgId, resolved: false } });
    const mfaEnabled = await prisma.mfaMethods.count();
    const mfaActiveUsers = await prisma.mfaMethods.groupBy({ by: ["userId"], where: { confirmed: true }, _count: true });

    const factors = [
      { name: "MFA Enabled", passed: mfaEnabled > 0, weight: 25 },
      { name: "Password Policy", passed: !!policy, weight: 20 },
      { name: "No Active Threats", passed: threats === 0, weight: 20 },
      { name: "Session Timeout", passed: (policy?.sessionTimeoutHours ?? 24) <= 24, weight: 15 },
      { name: "SSO Configured", passed: true, weight: 10 },
      { name: "IP Restriction", passed: (policy?.allowedIps?.length ?? 0) > 0, weight: 10 },
    ];

    const score = factors.reduce((acc, f) => acc + (f.passed ? f.weight : 0), 0);
    return { score, factors };
  }
}
