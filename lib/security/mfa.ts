import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";
import { randomBytes } from "crypto";
import { createHash } from "crypto";

function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () => randomBytes(4).toString("hex"));
}

export class MFAManager {
  static async getMethods(userId: string): Promise<any[]> {
    return prisma.mfaMethods.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  }

  static async setupTOTP(userId: string): Promise<{ secret: string; otpauthUrl: string; backupCodes: string[] }> {
    const secret = randomBytes(20).toString("hex");
    const backupCodes = generateBackupCodes();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "RepurposeAI";
    const otpauthUrl = `otpauth://totp/${appUrl}:${userId}?secret=${secret}&issuer=${appUrl}`;

    const existing = await prisma.mfaMethods.findFirst({ where: { userId, methodType: "totp" } });
    if (existing) throw new AppError("TOTP already configured", 409);

    await prisma.mfaMethods.create({
      data: {
        userId,
        methodType: "totp",
        secret,
        backupCodes,
        confirmed: false,
      },
    });

    return { secret, otpauthUrl, backupCodes };
  }

  static async confirmTOTP(userId: string, token: string): Promise<boolean> {
    const method = await prisma.mfaMethods.findFirst({ where: { userId, methodType: "totp", confirmed: false } });
    if (!method) throw new AppError("TOTP setup not found", 404);

    const isValid = this.verifyTOTP(method.secret || "", token);
    if (!isValid) return false;

    await prisma.mfaMethods.update({ where: { id: method.id }, data: { confirmed: true } });
    return true;
  }

  static async verifyTOTP(secret: string, token: string): Promise<boolean> {
    const time = Math.floor(Date.now() / 30000);
    for (let i = -1; i <= 1; i++) {
      const expected = this.generateTOTP(secret, time + i);
      if (expected === token) return true;
    }
    return false;
  }

  private static generateTOTP(secret: string, time: number): string {
    const buf = Buffer.alloc(8);
    for (let i = 7; i >= 0; i--) { buf[i] = time & 0xff; time >>= 8; }
    const hmac = createHash("sha1").update(secret + buf.toString("hex")).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
    return String(code % 1000000).padStart(6, "0");
  }

  static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const methods = await prisma.mfaMethods.findMany({ where: { userId } });
    for (const method of methods) {
      const idx = method.backupCodes.indexOf(code);
      if (idx !== -1) {
        const codes = [...method.backupCodes];
        codes.splice(idx, 1);
        await prisma.mfaMethods.update({ where: { id: method.id }, data: { backupCodes: codes } });
        return true;
      }
    }
    return false;
  }

  static async removeMethod(methodId: string): Promise<void> {
    await prisma.mfaMethods.delete({ where: { id: methodId } });
  }

  static async isMFARequired(orgId: string): Promise<boolean> {
    const policy = await prisma.securityPolicies.findUnique({ where: { organizationId: orgId } });
    return policy?.requireMfa ?? false;
  }

  static async generateEmailOTP(userId: string): Promise<string> {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const hash = createHash("sha256").update(otp).digest("hex");
    await prisma.mfaMethods.create({
      data: { userId, methodType: "email_otp", secret: hash, confirmed: true },
    });
    return otp;
  }

  static async verifyEmailOTP(userId: string, otp: string): Promise<boolean> {
    const hash = createHash("sha256").update(otp).digest("hex");
    const method = await prisma.mfaMethods.findFirst({
      where: { userId, methodType: "email_otp", secret: hash },
      orderBy: { createdAt: "desc" },
    });
    return !!method;
  }
}
