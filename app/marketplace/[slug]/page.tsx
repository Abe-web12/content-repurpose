import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getIntegrationBySlug } from "@/lib/marketplace/integrations";
import { getBaseUrl, getAppName } from "@/lib/utils";
import { IntegrationDetailClient } from "./client-page";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const integration = getIntegrationBySlug(slug);

  if (!integration) {
    return { title: "Integration Not Found - RepurposeAI" };
  }

  const baseUrl = getBaseUrl();
  const appName = getAppName();

  return {
    title: `${integration.name} Integration - ${appName}`,
    description: integration.description,
    openGraph: {
      title: `${integration.name} Integration - ${appName}`,
      description: integration.description,
      url: `${baseUrl}/marketplace/${slug}`,
      siteName: appName,
      type: "article",
      images: [
        {
          url: `${baseUrl}/og/marketplace/${slug}.png`,
          width: 1200,
          height: 630,
          alt: `${integration.name} Integration`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${integration.name} Integration - ${appName}`,
      description: integration.description,
      images: [`${baseUrl}/og/marketplace/${slug}.png`],
    },
    alternates: {
      canonical: `${baseUrl}/marketplace/${slug}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function MarketplaceSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const integration = getIntegrationBySlug(slug);

  if (!integration) notFound();

  return <IntegrationDetailClient integration={integration!} />;
}