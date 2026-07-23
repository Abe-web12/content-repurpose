import { PLANS as EXISTING_PLANS, type Plan } from "@/lib/constants/plans";

export type ExtendedPlanKey = "free" | "starter" | "pro" | "business" | "enterprise";

export interface ExtendedPlan extends Plan {
  monthlyCredits: number;
  overageRatePerCredit: number;
  storageLimit: number;
  scheduledPostsLimit: number;
  exportsPerMonth: number;
  apiRateLimit: number;
  teamSeats: number;
  addonCreditsPrice: number;
}

export interface OverageRate {
  credit: number;
  storage: number;
  scheduledPost: number;
  export: number;
  apiCall: number;
}

const OVERAGE_RATES: Record<string, OverageRate> = {
  free: { credit: 0.10, storage: 0, scheduledPost: 0, export: 0, apiCall: 0 },
  starter: { credit: 0.08, storage: 0.01, scheduledPost: 0.05, export: 0.02, apiCall: 0.001 },
  pro: { credit: 0.05, storage: 0.005, scheduledPost: 0.03, export: 0.01, apiCall: 0.0005 },
  business: { credit: 0.03, storage: 0.003, scheduledPost: 0.02, export: 0.005, apiCall: 0.0002 },
  enterprise: { credit: 0.02, storage: 0.002, scheduledPost: 0.01, export: 0.003, apiCall: 0.0001 },
};

export const EXTENDED_PLANS: Record<string, ExtendedPlan> = {
  free: {
    ...EXISTING_PLANS.free, key: "free" as any,
    monthlyCredits: 3, overageRatePerCredit: 0.10, storageLimit: 50,
    scheduledPostsLimit: 5, exportsPerMonth: 0, apiRateLimit: 10,
    teamSeats: 1, addonCreditsPrice: 0.10,
  },
  starter: {
    ...EXISTING_PLANS.starter, key: "starter" as any,
    monthlyCredits: 30, overageRatePerCredit: 0.08, storageLimit: 500,
    scheduledPostsLimit: 50, exportsPerMonth: 10, apiRateLimit: 60,
    teamSeats: 1, addonCreditsPrice: 0.08,
  },
  pro: {
    ...EXISTING_PLANS.pro, key: "pro" as any,
    monthlyCredits: 200, overageRatePerCredit: 0.05, storageLimit: 5000,
    scheduledPostsLimit: -1, exportsPerMonth: 100, apiRateLimit: 300,
    teamSeats: 3, addonCreditsPrice: 0.05,
  },
  business: {
    key: "business" as any, name: "Business", price: 149, priceLabel: "$149/mo",
    generations: -1, generationsLabel: "Unlimited",
    voiceProfiles: -1,
    features: ["Unlimited everything", "50 team seats", "Priority support", "Custom brand kits", "API access", "SSO", "Audit logs", "Dedicated account manager"],
    popular: false, priceId: process.env.STRIPE_BUSINESS_PRICE_ID || null,
    monthlyCredits: 1000,
    overageRatePerCredit: 0.03,
    storageLimit: 50000,
    scheduledPostsLimit: -1,
    exportsPerMonth: -1,
    apiRateLimit: 1000,
    teamSeats: 50,
    addonCreditsPrice: 0.05,
  },
  enterprise: {
    key: "enterprise" as any, name: "Enterprise", price: 499, priceLabel: "$499/mo",
    generations: -1, generationsLabel: "Unlimited",
    voiceProfiles: -1,
    features: ["Unlimited everything", "Unlimited team seats", "White-label", "Custom AI models", "SLA", "SSO/SAML", "Dedicated infrastructure", "Custom integration"],
    popular: false, priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || null,
    monthlyCredits: 5000,
    overageRatePerCredit: 0.02,
    storageLimit: -1,
    scheduledPostsLimit: -1,
    exportsPerMonth: -1,
    apiRateLimit: -1,
    teamSeats: -1,
    addonCreditsPrice: 0.03,
  },
};

export function getOverageRate(plan: string, type: keyof OverageRate): number {
  return OVERAGE_RATES[plan]?.[type] ?? 0.10;
}

export function calculateOverageCost(plan: string, type: keyof OverageRate, units: number): number {
  return units * getOverageRate(plan, type);
}

export const CREDIT_PACKAGES = [
  { credits: 50, priceCents: 499, label: "50 Credits" },
  { credits: 100, priceCents: 899, label: "100 Credits", popular: true },
  { credits: 500, priceCents: 3999, label: "500 Credits" },
  { credits: 1000, priceCents: 6999, label: "1000 Credits" },
  { credits: 5000, priceCents: 29999, label: "5000 Credits" },
];

export const ADDON_PRODUCTS = [
  { type: "credits", name: "Extra AI Credits (100)", creditsAmount: 100, priceCents: 999 },
  { type: "storage", name: "Extra Storage (1GB)", creditsAmount: 0, priceCents: 499 },
  { type: "seats", name: "Extra Team Seat", creditsAmount: 0, priceCents: 999 },
  { type: "priority", name: "Priority Generation (1 month)", creditsAmount: 0, priceCents: 1999 },
];

export const LIFETIME_PLANS = [
  { name: "Lifetime Starter", price: 199, planTier: "starter", creditPack: 500 },
  { name: "Lifetime Pro", price: 399, planTier: "pro", creditPack: 2000 },
  { name: "Lifetime Unlimited", price: 799, planTier: "enterprise", creditPack: 10000 },
];
