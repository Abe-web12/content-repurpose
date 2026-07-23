import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";

export class ComplianceManager {
  static async recordConsent(userId: string, consentType: string, granted: boolean, ipAddress?: string, userAgent?: string): Promise<void> {
    await prisma.complianceConsents.create({
      data: { userId, consentType, granted, ipAddress, userAgent },
    });
  }

  static async getConsents(userId: string): Promise<any[]> {
    return prisma.complianceConsents.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async hasConsent(userId: string, consentType: string): Promise<boolean> {
    const consent = await prisma.complianceConsents.findFirst({
      where: { userId, consentType, granted: true },
      orderBy: { createdAt: "desc" },
    });
    return !!consent;
  }

  static async createPrivacyRequest(userId: string, requestType: string, details?: any): Promise<any> {
    const existing = await prisma.privacyRequests.findFirst({
      where: { userId, requestType, status: "pending" },
    });
    if (existing) throw new AppError("A pending request of this type already exists", 409);

    return prisma.privacyRequests.create({
      data: { userId, requestType, details: details ? JSON.parse(JSON.stringify(details)) : null },
    });
  }

  static async getPrivacyRequests(userId: string): Promise<any[]> {
    return prisma.privacyRequests.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getPendingRequests(limit = 50): Promise<any[]> {
    return prisma.privacyRequests.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  static async processPrivacyRequest(requestId: string, action: "approve" | "deny"): Promise<void> {
    const request = await prisma.privacyRequests.findUnique({ where: { id: requestId } });
    if (!request) throw new AppError("Request not found", 404);

    if (action === "approve") {
      if (request.requestType === "delete") {
        await prisma.users.update({
          where: { id: request.userId },
          data: {
            email: `deleted-${request.userId}@deleted.com`,
            fullName: "Deleted User",
            passwordHash: "",
            plan: "free",
            generationsLimit: 0,
          },
        });
      }
    }

    await prisma.privacyRequests.update({
      where: { id: requestId },
      data: { status: action === "approve" ? "completed" : "denied", completedAt: new Date() },
    });
  }

  static async exportUserData(userId: string): Promise<any> {
    const [user, generations, sessions, auditLogs, consents] = await Promise.all([
      prisma.users.findUnique({ where: { id: userId } }),
      prisma.generations.findMany({ where: { userId } }),
      prisma.userSessions.findMany({ where: { userId } }),
      prisma.securityAuditLogs.findMany({ where: { actorId: userId } }),
      prisma.complianceConsents.findMany({ where: { userId } }),
    ]);

    return { user, generations, sessions, auditLogs, consents };
  }
}
