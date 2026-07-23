import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CREDIT_PACKAGES = [
  { name: "Starter Pack", credits: 50, priceCents: 499, currency: "usd", stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || null, sortOrder: 1 },
  { name: "Popular Pack", credits: 100, priceCents: 899, currency: "usd", stripePriceId: process.env.STRIPE_POPULAR_PRICE_ID || null, sortOrder: 2 },
  { name: "Pro Pack", credits: 500, priceCents: 3999, currency: "usd", stripePriceId: process.env.STRIPE_PRO_PRICE_ID || null, sortOrder: 3 },
  { name: "Power Pack", credits: 1000, priceCents: 6999, currency: "usd", stripePriceId: process.env.STRIPE_POWER_PRICE_ID || null, sortOrder: 4 },
  { name: "Enterprise Pack", credits: 5000, priceCents: 29999, currency: "usd", stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || null, sortOrder: 5 },
];

const ADDON_PRODUCTS = [
  {
    name: "Extra AI Credits (100)",
    description: "100 additional AI credits for content generation and rewriting",
    type: "credits",
    creditsAmount: 100,
    priceCents: 999,
    currency: "usd",
    stripePriceId: process.env.STRIPE_ADDON_CREDITS_PRICE_ID || null,
  },
  {
    name: "Extra Storage (1 GB)",
    description: "1 GB additional storage for media and generated content",
    type: "storage",
    creditsAmount: 0,
    priceCents: 499,
    currency: "usd",
    stripePriceId: process.env.STRIPE_ADDON_STORAGE_PRICE_ID || null,
  },
  {
    name: "Extra Team Seat",
    description: "Add one additional team member to your workspace",
    type: "seats",
    creditsAmount: 0,
    priceCents: 999,
    currency: "usd",
    stripePriceId: process.env.STRIPE_ADDON_SEAT_PRICE_ID || null,
  },
  {
    name: "Priority Processing (1 Month)",
    description: "Priority queue for AI generation jobs — skip the line for 30 days",
    type: "priority",
    creditsAmount: 0,
    priceCents: 1999,
    currency: "usd",
    stripePriceId: process.env.STRIPE_ADDON_PRIORITY_PRICE_ID || null,
  },
];

const LIFETIME_PLANS = [
  {
    name: "Lifetime Starter",
    description: "Lifetime access to Starter tier with 500 bonus credits",
    priceCents: 19900,
    currency: "usd",
    stripePriceId: process.env.STRIPE_LIFETIME_STARTER_PRICE_ID || null,
    planTier: "starter",
    featureLimit: "starter",
    creditPack: 500,
  },
  {
    name: "Lifetime Pro",
    description: "Lifetime access to Pro tier with 2000 bonus credits",
    priceCents: 39900,
    currency: "usd",
    stripePriceId: process.env.STRIPE_LIFETIME_PRO_PRICE_ID || null,
    planTier: "pro",
    featureLimit: "pro",
    creditPack: 2000,
  },
  {
    name: "Lifetime Unlimited",
    description: "Lifetime access to Enterprise tier with 10000 bonus credits",
    priceCents: 79900,
    currency: "usd",
    stripePriceId: process.env.STRIPE_LIFETIME_UNLIMITED_PRICE_ID || null,
    planTier: "enterprise",
    featureLimit: "enterprise",
    creditPack: 10000,
  },
];

async function seedCreditPackages() {
  for (const pkg of CREDIT_PACKAGES) {
    await prisma.creditPackages.upsert({
      where: { id: `seed_${pkg.name.toLowerCase().replace(/\s+/g, "_")}` },
      update: pkg,
      create: { id: `seed_${pkg.name.toLowerCase().replace(/\s+/g, "_")}`, ...pkg },
    });
  }
}

async function seedAddonProducts() {
  for (const product of ADDON_PRODUCTS) {
    await prisma.addonProducts.upsert({
      where: { id: `seed_addon_${product.type}_${product.creditsAmount || product.name.toLowerCase().replace(/\s+/g, "_")}` },
      update: product,
      create: {
        id: `seed_addon_${product.type}_${product.creditsAmount || product.name.toLowerCase().replace(/\s+/g, "_")}`,
        ...product,
      },
    });
  }
}

async function seedLifetimePlans() {
  for (const plan of LIFETIME_PLANS) {
    await prisma.lifetimePlans.upsert({
      where: { id: `seed_lifetime_${plan.planTier}` },
      update: plan,
      create: { id: `seed_lifetime_${plan.planTier}`, ...plan },
    });
  }
}

async function main() {
  await seedCreditPackages();
  await seedAddonProducts();
  await seedLifetimePlans();
}

main()
  .then(() => {
    console.log("Seed complete — created/updated CreditPackage, AddonProduct, LifetimePlan records");
  })
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
