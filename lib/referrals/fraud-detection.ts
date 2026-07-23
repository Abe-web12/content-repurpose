import { prisma } from "@/lib/prisma";

const DISPOSABLE_DOMAINS = [
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "throwaway.email", "yopmail.com", "sharklasers.com", "trashmail.com",
  "maildrop.cc", "getairmail.com", "temp-mail.org", "fakeinbox.com",
];

export interface FraudCheckResult {
  flagged: boolean;
  reason?: string;
  score: number;
}

export class FraudDetector {
  static async check(inviteeId: string, inviterId: string): Promise<FraudCheckResult> {
    const invitee = await prisma.users.findUnique({
      where: { id: inviteeId },
      select: { email: true },
    });

    if (!invitee?.email) return { flagged: true, reason: "Invalid invitee", score: 1 };

    let score = 0;
    const reasons: string[] = [];

    if (this.isDisposableEmail(invitee.email)) {
      score += 0.5;
      reasons.push("Disposable email address");
    }

    const sameIpInvitees = await prisma.referralEvents.count({
      where: {
        inviterId,
        inviteeEmail: invitee.email,
        eventType: "signup",
      },
    });
    if (sameIpInvitees > 0) {
      score += 0.5;
      reasons.push("Duplicate email referral");
    }

    if (await this.hasMultipleAccounts(invitee.email)) {
      score += 0.7;
      reasons.push("Multiple accounts detected");
    }

    const flagged = score >= 0.5;

    return {
      flagged,
      reason: flagged ? reasons.join("; ") : undefined,
      score,
    };
  }

  private static isDisposableEmail(email: string): boolean {
    const domain = email.split("@")[1]?.toLowerCase();
    return DISPOSABLE_DOMAINS.includes(domain);
  }

  private static async hasMultipleAccounts(email: string): Promise<boolean> {
    const count = await prisma.users.count({ where: { email } });
    return count > 1;
  }

  static async checkPaymentFraud(userId: string): Promise<FraudCheckResult> {
    const existingSubscriptions = await prisma.subscriptions.count({
      where: { userId, status: "ACTIVE" },
    });
    if (existingSubscriptions > 3) {
      return { flagged: true, reason: "Excessive active subscriptions", score: 0.8 };
    }
    return { flagged: false, score: 0 };
  }

  static async getFlags(limit = 50): Promise<Array<{ id: string; inviterId: string; inviteeEmail: string | null; metadata: any; createdAt: Date }>> {
    return prisma.referralEvents.findMany({
      where: { status: "FLAGGED" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, inviterId: true, inviteeEmail: true, metadata: true, createdAt: true },
    }) as any;
  }
}
