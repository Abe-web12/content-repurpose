import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { IntegrationsDashboard } from "./dashboard";
import { auth } from "@clerk/nextjs/server";

export const metadata = {
  title: "Integrations - RepurposeAI",
  description: "Manage your installed integrations",
};

export default async function IntegrationsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const membership = await prisma.organizationMembers.findFirst({
    where: { userId: userId },
    select: { organizationId: true, role: true },
  });

  if (!membership) redirect("/");

  const installedIntegrations = await prisma.installedIntegrations.findMany({
    where: { organizationId: membership.organizationId },
    orderBy: { createdAt: "desc" },
  });

  const integrationKeys = installedIntegrations.map((i) => i.integrationKey);
  const integrations = await prisma.integrations.findMany({
    where: { key: { in: integrationKeys } },
  });

  const integrationsMap = Object.fromEntries(
    integrations.map((i) => [i.key, i])
  );

  const enriched = installedIntegrations.map((installed) => ({
    ...installed,
    integration: integrationsMap[installed.integrationKey] || null,
  }));

  return (
    <IntegrationsDashboard
      installed={enriched as any}
      organizationId={membership.organizationId}
    />
  );
}
