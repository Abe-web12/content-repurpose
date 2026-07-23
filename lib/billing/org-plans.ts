import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";

const ORG_TIER_ORDER: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
  enterprise: 4,
};

const ORG_PLAN_LIMITS: Record<string, { maxSeats: number; maxStorage: number; maxApiRequests: number }> = {
  free: { maxSeats: 5, maxStorage: 0, maxApiRequests: 100 },
  starter: { maxSeats: 10, maxStorage: 1, maxApiRequests: 1000 },
  pro: { maxSeats: 25, maxStorage: 5, maxApiRequests: 5000 },
  business: { maxSeats: 50, maxStorage: 20, maxApiRequests: 25000 },
  enterprise: { maxSeats: -1, maxStorage: -1, maxApiRequests: -1 },
};

export async function getOrgPlan(organizationId: string) {
  const org = await prisma.organizations.findUnique({
    where: { id: organizationId },
    select: { plan: true, maxSeats: true },
  });
  if (!org) throw new AppError("Organization not found", 404);
  return org;
}

export async function requireOrgTier(organizationId: string, minTier: string): Promise<void> {
  const org = await getOrgPlan(organizationId);
  const orgTier = ORG_TIER_ORDER[org.plan] ?? -1;
  const required = ORG_TIER_ORDER[minTier] ?? 0;
  if (orgTier < required) {
    throw new AppError(`Your organization plan does not support this feature. Upgrade from ${org.plan} to ${minTier}.`, 403);
  }
}

export async function checkOrgSeatAvailable(organizationId: string): Promise<boolean> {
  const org = await getOrgPlan(organizationId);
  if (org.maxSeats === -1) return true;

  const memberCount = await prisma.organizationMembers.count({
    where: { organizationId },
  });
  return memberCount < org.maxSeats;
}

export async function requireOrgSeat(organizationId: string): Promise<void> {
  const available = await checkOrgSeatAvailable(organizationId);
  if (!available) {
    throw new AppError("Organization seat limit reached. Upgrade your plan to add more members.", 403);
  }
}

export async function getOrgRemainingSeats(organizationId: string): Promise<number> {
  const org = await getOrgPlan(organizationId);
  if (org.maxSeats === -1) return Infinity;

  const memberCount = await prisma.organizationMembers.count({
    where: { organizationId },
  });
  return Math.max(0, org.maxSeats - memberCount);
}

export const TIER_ORDER = ORG_TIER_ORDER;
export const PLAN_LIMITS = ORG_PLAN_LIMITS;
