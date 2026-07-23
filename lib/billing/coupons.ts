import { prisma } from "@/lib/prisma";

export class CouponEngine {
  static async validate(
    code: string,
    context?: { plan?: string; userId?: string; amount?: number },
  ): Promise<{
    valid: boolean;
    error?: string;
    coupon?: any;
    discountAmount?: number;
  }> {
    const coupon = await prisma.coupons.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon) return { valid: false, error: "Invalid coupon code" };
    if (!coupon.isActive) return { valid: false, error: "Coupon is no longer active" };

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return { valid: false, error: "Coupon has expired" };
    }

    if (coupon.startsAt && coupon.startsAt > new Date()) {
      return { valid: false, error: "Coupon is not yet valid" };
    }

    if (coupon.maxUses > 0) {
      const usageCount = await prisma.couponUsages.count({
        where: { couponId: coupon.id },
      });
      if (usageCount >= coupon.maxUses) {
        return { valid: false, error: "Coupon usage limit reached" };
      }
    }

    if (context?.userId && coupon.maxPerUser > 0) {
      const userUsage = await prisma.couponUsages.count({
        where: { couponId: coupon.id, userId: context.userId },
      });
      if (userUsage >= coupon.maxPerUser) {
        return { valid: false, error: "You have already used this coupon" };
      }
    }

    if (context?.plan && coupon.planRestrictions) {
      const restrictions = coupon.planRestrictions as string[];
      if (Array.isArray(restrictions) && restrictions.length > 0) {
        if (!restrictions.includes(context.plan)) {
          return { valid: false, error: `Coupon valid only for: ${restrictions.join(", ")}` };
        }
      }
    }

    let discountAmount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      const baseAmount = context?.amount ?? 0;
      discountAmount = Math.round(baseAmount * (coupon.discountValue / 100) * 100) / 100;

      if (coupon.maxAmount && discountAmount > coupon.maxAmount) {
        discountAmount = coupon.maxAmount;
      }
    } else {
      discountAmount = coupon.discountValue;
      if (context?.amount && discountAmount > context.amount) {
        discountAmount = context.amount;
      }
    }

    discountAmount = Math.round(discountAmount * 100) / 100;

    if (coupon.minAmount && (context?.amount ?? 0) < coupon.minAmount) {
      return { valid: false, error: `Minimum order amount of $${coupon.minAmount} required` };
    }

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      discountAmount,
    };
  }

  static async apply(couponId: string, userId: string, options?: { checkoutId?: string; amount?: number }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.coupons.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      });

      await tx.couponUsages.create({
        data: {
          couponId,
          userId,
          checkoutId: options?.checkoutId ?? null,
          amount: options?.amount ?? null,
        },
      });
    });
  }

  static async create(data: {
    code: string;
    discountType: "PERCENTAGE" | "FIXED";
    discountValue: number;
    maxUses?: number;
    maxPerUser?: number;
    planRestrictions?: string[];
    minAmount?: number;
    maxAmount?: number;
    startsAt?: Date;
    expiresAt?: Date;
  }): Promise<any> {
    const existing = await prisma.coupons.findUnique({ where: { code: data.code.toUpperCase() } });
    if (existing) throw new Error("Coupon code already exists");

    return prisma.coupons.create({
      data: {
        code: data.code.toUpperCase(),
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxUses: data.maxUses ?? 0,
        maxPerUser: data.maxPerUser ?? 1,
        planRestrictions: data.planRestrictions ?? undefined,
        minAmount: data.minAmount ?? null,
        maxAmount: data.maxAmount ?? null,
        startsAt: data.startsAt ?? null,
        expiresAt: data.expiresAt ?? null,
        metadata: {} as any,
      },
    });
  }

  static async list(): Promise<any[]> {
    return prisma.coupons.findMany({ orderBy: { createdAt: "desc" } });
  }

  static async toggle(code: string, active: boolean): Promise<void> {
    await prisma.coupons.update({
      where: { code: code.toUpperCase() },
      data: { isActive: active },
    });
  }

  static async delete(code: string): Promise<void> {
    await prisma.coupons.delete({ where: { code: code.toUpperCase() } });
  }

  static async getUsageStats(couponId: string): Promise<{ totalUses: number; uniqueUsers: number; totalDiscount: number }> {
    const [totalUses, uniqueUsers, usageAgg] = await Promise.all([
      prisma.couponUsages.count({ where: { couponId } }),
      prisma.couponUsages.groupBy({ by: ["userId"], where: { couponId } }),
      prisma.couponUsages.aggregate({ where: { couponId }, _sum: { amount: true } }),
    ]);

    return {
      totalUses,
      uniqueUsers: uniqueUsers.length,
      totalDiscount: usageAgg._sum.amount ?? 0,
    };
  }
}
