import { prisma } from "@/lib/prisma";
import { cacheGet, cacheKey } from "@/lib/utils/cache";
import { subDays, format, startOfDay } from "date-fns";

export interface CustomerSegmentResult {
  name: string;
  count: number;
  percentage: number;
  revenue: number;
  description: string;
}

export interface ConversionFunnelStage {
  stage: string;
  count: number;
  conversion: number;
}

export interface CohortRow {
  period: string;
  customers: number;
  periods: { index: number; retention: number; revenue: number }[];
}

export interface BehaviorPoint {
  date: string;
  activeUsers: number;
  generations: number;
  publishes: number;
}

export interface CustomerLifetimeRow {
  userId: string;
  segment: string;
  ltv: number;
  cac: number;
  paybackPeriod: number;
  isPowerUser: boolean;
  isInactive: boolean;
  isExpansionCandidate: boolean;
  isEnterpriseProspect: boolean;
  isTrialUser: boolean;
}

export class CustomerAnalytics {
  static async getSegments(organizationId: string): Promise<CustomerSegmentResult[]> {
    return cacheGet<CustomerSegmentResult[]>(cacheKey("analytics", "customers", "segments", organizationId), async () => {
      const thirtyDaysAgo = subDays(new Date(), 30);
      const [total, active, brandNew, suspended, powerUsers, enterpriseProspects, trialUsers] = await Promise.all([
        prisma.organizationMembers.count({ where: { organizationId } }),
        prisma.organizationMembers.count({ where: { organizationId, joinedAt: { gte: thirtyDaysAgo } } }),
        prisma.organizationMembers.count({ where: { organizationId, joinedAt: { gte: thirtyDaysAgo } } }),
        prisma.organizationMembers.count({ where: { organizationId, isSuspended: true } }),
        prisma.analyticsCustomerLifetime.count({ where: { organizationId, isPowerUser: true } }),
        prisma.analyticsCustomerLifetime.count({ where: { organizationId, isEnterpriseProspect: true } }),
        prisma.analyticsCustomerLifetime.count({ where: { organizationId, isTrialUser: true } }),
      ]);

      const totalMembers = total || 1;
      return [
        { name: "Power Users", count: powerUsers, percentage: Math.round((powerUsers / totalMembers) * 100), revenue: 0, description: "Top activity users" },
        { name: "Inactive Users", count: totalMembers - active, percentage: Math.round(((totalMembers - active) / totalMembers) * 100), revenue: 0, description: "No activity in 30 days" },
        { name: "Expansion Candidates", count: powerUsers, percentage: Math.round((powerUsers / totalMembers) * 100), revenue: 0, description: "High usage, growth potential" },
        { name: "Enterprise Prospects", count: enterpriseProspects, percentage: Math.round((enterpriseProspects / totalMembers) * 100), revenue: 0, description: "Large team footprint" },
        { name: "Trial Users", count: trialUsers, percentage: Math.round((trialUsers / totalMembers) * 100), revenue: 0, description: "On trial plan" },
        { name: "At Risk", count: suspended, percentage: Math.round((suspended / totalMembers) * 100), revenue: 0, description: "Suspended members" },
      ];
    }, 600);
  }

  static async getConversionFunnel(organizationId: string): Promise<ConversionFunnelStage[]> {
    const totalMembers = await prisma.organizationMembers.count({ where: { organizationId } });
    const recentMembers = await prisma.organizationMembers.count({
      where: { organizationId, joinedAt: { gte: subDays(new Date(), 30) } },
    });
    const memberUserIds = (await prisma.organizationMembers.findMany({
      where: { organizationId },
      select: { userId: true },
    })).map((m) => m.userId);
    const generatingCount = await prisma.generations.count({
      where: { userId: { in: memberUserIds }, createdAt: { gte: subDays(new Date(), 30) } },
    });
    const payingMembers = await prisma.subscriptions.count({
      where: { userId: { in: memberUserIds }, status: "ACTIVE" },
    });

    const stages: { stage: string; count: number }[] = [
      { stage: "Signed Up", count: totalMembers },
      { stage: "Activated", count: recentMembers },
      { stage: "Generated Content", count: generatingCount },
      { stage: "Paying Customer", count: payingMembers },
    ];

    return stages.map((s, i) => ({
      ...s,
      conversion: i === 0 ? 100 : s.count > 0 && stages[i - 1].count > 0 ? Math.round((s.count / stages[i - 1].count) * 100) : 0,
    }));
  }

  static async getCohorts(organizationId: string): Promise<CohortRow[]> {
    return cacheGet<CohortRow[]>(cacheKey("analytics", "customers", "cohorts", organizationId), async () => {
      const members = await prisma.organizationMembers.findMany({
        where: { organizationId },
        orderBy: { joinedAt: "asc" },
        select: { id: true, joinedAt: true, isSuspended: true },
      });

      const monthlyCohorts = new Map<string, { suspended: number; total: number }>();
      for (const m of members) {
        const key = format(m.joinedAt, "yyyy-MM");
        if (!monthlyCohorts.has(key)) monthlyCohorts.set(key, { suspended: 0, total: 0 });
        const c = monthlyCohorts.get(key)!;
        c.total++;
        if (m.isSuspended) c.suspended++;
      }

      const cohorts: CohortRow[] = [];
      const now = new Date();
      for (const [period, data] of monthlyCohorts) {
        const periods: { index: number; retention: number; revenue: number }[] = [];
        const cohortStart = new Date(period + "-01");
        for (let i = 0; i < 6; i++) {
          const periodStart = new Date(cohortStart);
          periodStart.setMonth(periodStart.getMonth() + i);
          const periodEnd = new Date(periodStart);
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          if (periodEnd > now) break;
          const active = data.total - data.suspended;
          periods.push({ index: i, retention: data.total > 0 ? Math.round((active / data.total) * 100) : 0, revenue: 0 });
        }
        cohorts.push({ period, customers: data.total, periods });
      }
      return cohorts.sort((a, b) => a.period.localeCompare(b.period)).slice(-12);
    }, 3600);
  }

  static async getBehavior(organizationId: string, days: number): Promise<BehaviorPoint[]> {
    const startDate = startOfDay(subDays(new Date(), days));
    const memberUserIds = (await prisma.organizationMembers.findMany({
      where: { organizationId },
      select: { userId: true },
    })).map((m) => m.userId);

    const generations = await prisma.generations.findMany({
      where: { userId: { in: memberUserIds }, createdAt: { gte: startDate } },
      select: { createdAt: true, userId: true },
    });

    const result: BehaviorPoint[] = [];
    for (let i = days; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const dayStr = format(day, "yyyy-MM-dd");
      const dayEnd = new Date(day);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dayGens = generations.filter((g) => g.createdAt >= day && g.createdAt < dayEnd);
      const active = new Set(dayGens.map((g) => g.userId)).size;
      result.push({ date: dayStr, activeUsers: active, generations: dayGens.length, publishes: 0 });
    }
    return result;
  }

  static async getLifetimeRows(organizationId: string, cursor?: string, limit = 50): Promise<{ data: CustomerLifetimeRow[]; nextCursor: string | null }> {
    const items = await prisma.analyticsCustomerLifetime.findMany({
      where: { organizationId },
      orderBy: { ltv: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = items.length > limit;
    const data = (hasMore ? items.slice(0, limit) : items).map((r) => ({
      userId: r.userId,
      segment: r.segment,
      ltv: Number(r.ltv),
      cac: Number(r.cac),
      paybackPeriod: r.paybackPeriod,
      isPowerUser: r.isPowerUser,
      isInactive: r.isInactive,
      isExpansionCandidate: r.isExpansionCandidate,
      isEnterpriseProspect: r.isEnterpriseProspect,
      isTrialUser: r.isTrialUser,
    }));
    return { data, nextCursor: hasMore ? items[limit - 1].id : null };
  }
}