export interface DefaultIntegration {
  id: string;
  integrationKey: string;
  name: string;
  description: string;
  shortDescription: string;
  category: string;
  featured: boolean;
  installCount: number;
  averageRating: number;
  reviewCount: number;
  isFree: boolean;
  tags: string[];
  icon: string;
  provider: string;
  websiteUrl: string;
  docsUrl: string;
  pricingUrl: string | null;
  supportUrl: string;
  images: string[];
}

export const DEFAULT_INTEGRATIONS: DefaultIntegration[] = [
  {
    id: "default-linkedin",
    integrationKey: "linkedin",
    name: "LinkedIn",
    description: "Auto-post text updates, articles, and carousel posts directly to LinkedIn. Schedule content and track engagement metrics across your company page and personal profile.",
    shortDescription: "Auto-post text & carousels to LinkedIn",
    category: "SOCIAL",
    featured: true,
    installCount: 1240,
    averageRating: 4.7,
    reviewCount: 89,
    isFree: true,
    tags: ["social-media", "linkedin", "marketing", "content-publishing"],
    icon: "/icons/linkedin.svg",
    provider: "RepurposeAI",
    websiteUrl: "https://www.linkedin.com",
    docsUrl: "/docs/integrations/linkedin",
    pricingUrl: null,
    supportUrl: "/support",
    images: [],
  },
  {
    id: "default-twitter",
    integrationKey: "twitter",
    name: "Twitter / X",
    description: "Auto-publish threads, single tweets, and media-rich posts. Repurpose long-form content into engaging Twitter threads with scheduled posting.",
    shortDescription: "Auto-publish threads & tweets",
    category: "SOCIAL",
    featured: true,
    installCount: 980,
    averageRating: 4.5,
    reviewCount: 67,
    isFree: true,
    tags: ["social-media", "twitter", "threads", "content-publishing"],
    icon: "/icons/twitter.svg",
    provider: "RepurposeAI",
    websiteUrl: "https://x.com",
    docsUrl: "/docs/integrations/twitter",
    pricingUrl: null,
    supportUrl: "/support",
    images: [],
  },
  {
    id: "default-youtube",
    integrationKey: "youtube",
    name: "YouTube",
    description: "Import video transcripts for content repurposing. Auto-generate short-form clips from long videos and publish directly to your YouTube channel.",
    shortDescription: "Transcript importer & auto-shorts creator",
    category: "SOCIAL",
    featured: true,
    installCount: 756,
    averageRating: 4.6,
    reviewCount: 54,
    isFree: true,
    tags: ["video", "youtube", "transcript", "shorts", "content-publishing"],
    icon: "/icons/youtube.svg",
    provider: "RepurposeAI",
    websiteUrl: "https://youtube.com",
    docsUrl: "/docs/integrations/youtube",
    pricingUrl: null,
    supportUrl: "/support",
    images: [],
  },
  {
    id: "default-wordpress",
    integrationKey: "wordpress",
    name: "WordPress",
    description: "Publish blog posts directly from RepurposeAI to your WordPress site. Supports categories, tags, featured images, and custom post types.",
    shortDescription: "Publish blog posts directly",
    category: "CMS",
    featured: true,
    installCount: 623,
    averageRating: 4.4,
    reviewCount: 42,
    isFree: true,
    tags: ["cms", "wordpress", "blogging", "content-publishing"],
    icon: "/icons/wordpress.svg",
    provider: "RepurposeAI",
    websiteUrl: "https://wordpress.org",
    docsUrl: "/docs/integrations/wordpress",
    pricingUrl: null,
    supportUrl: "/support",
    images: [],
  },
  {
    id: "default-medium",
    integrationKey: "medium",
    name: "Medium",
    description: "Export and publish articles to Medium with one click. Supports formatting, images, tags, and publication integration.",
    shortDescription: "Export articles automatically",
    category: "CMS",
    featured: false,
    installCount: 412,
    averageRating: 4.3,
    reviewCount: 31,
    isFree: true,
    tags: ["blogging", "medium", "content-publishing", "cms"],
    icon: "/icons/medium.svg",
    provider: "RepurposeAI",
    websiteUrl: "https://medium.com",
    docsUrl: "/docs/integrations/medium",
    pricingUrl: null,
    supportUrl: "/support",
    images: [],
  },
  {
    id: "default-notion",
    integrationKey: "notion",
    name: "Notion",
    description: "Sync generated content to Notion databases automatically. Perfect for content calendars, editorial workflows, and team collaboration.",
    shortDescription: "Sync saved content to Notion databases",
    category: "PRODUCTIVITY",
    featured: false,
    installCount: 534,
    averageRating: 4.5,
    reviewCount: 38,
    isFree: true,
    tags: ["productivity", "notion", "sync", "databases"],
    icon: "/icons/notion.svg",
    provider: "RepurposeAI",
    websiteUrl: "https://notion.so",
    docsUrl: "/docs/integrations/notion",
    pricingUrl: null,
    supportUrl: "/support",
    images: [],
  },
  {
    id: "default-zapier",
    integrationKey: "zapier",
    name: "Zapier / Webhooks",
    description: "Connect RepurposeAI to 5000+ apps via Zapier or custom webhooks. Trigger content generation workflows from any app in your stack.",
    shortDescription: "Custom workflow triggers for any app",
    category: "AUTOMATION",
    featured: false,
    installCount: 891,
    averageRating: 4.6,
    reviewCount: 61,
    isFree: true,
    tags: ["automation", "zapier", "webhooks", "workflow", "api"],
    icon: "/icons/zapier.svg",
    provider: "RepurposeAI",
    websiteUrl: "https://zapier.com",
    docsUrl: "/docs/integrations/zapier",
    pricingUrl: null,
    supportUrl: "/support",
    images: [],
  },
];

export function getDefaultCategories(): Array<{ category: string; count: number }> {
  const map = new Map<string, number>();
  for (const item of DEFAULT_INTEGRATIONS) {
    map.set(item.category, (map.get(item.category) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export function getDefaultFeatured(): DefaultIntegration[] {
  return DEFAULT_INTEGRATIONS.filter((i) => i.featured);
}

export function filterDefaultIntegrations(options: {
  category?: string;
  search?: string;
  sort?: string;
  featured?: boolean;
  isFree?: boolean;
}): DefaultIntegration[] {
  let result = [...DEFAULT_INTEGRATIONS];

  if (options.featured) {
    result = result.filter((i) => i.featured);
  }

  if (options.isFree !== undefined) {
    result = result.filter((i) => i.isFree === options.isFree);
  }

  if (options.category) {
    result = result.filter((i) => i.category === options.category);
  }

  if (options.search) {
    const q = options.search.toLowerCase();
    result = result.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.shortDescription.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }

  switch (options.sort) {
    case "rating":
      result.sort((a, b) => b.averageRating - a.averageRating);
      break;
    case "newest":
      break;
    case "name":
      result.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "popular":
    default:
      result.sort((a, b) => b.installCount - a.installCount);
      break;
  }

  return result;
}
