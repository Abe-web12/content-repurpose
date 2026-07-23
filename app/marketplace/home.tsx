"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketplaceHero } from "@/components/integrations/marketplace-hero";
import { MarketplaceCategories } from "@/components/integrations/marketplace-categories";
import { MarketplaceFilters } from "@/components/integrations/marketplace-filters";
import { MarketplaceSidebar } from "@/components/integrations/marketplace-sidebar";
import { FeaturedApps } from "@/components/integrations/featured-apps";
import { IntegrationGrid } from "@/components/integrations/integration-grid";
import { InstallButton } from "@/components/integrations/install-button";
import { Loader2 } from "lucide-react";

interface MarketplaceListing {
  id: string;
  integrationKey: string;
  name: string;
  description: string;
  category: string;
  featured: boolean;
  installCount: number;
  averageRating: number;
  isFree: boolean;
  tags: string[];
}

interface MarketplaceHomeProps {
  featured: MarketplaceListing[];
  categories: Array<{ category: string; count: number }>;
  listings: MarketplaceListing[];
  organizationId: string;
}

export function MarketplaceHome({ featured, categories: initialCategories, listings: initialListings, organizationId }: MarketplaceHomeProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sort, setSort] = useState("popular");
  const [listings, setListings] = useState(initialListings);
  const [loading, setLoading] = useState(false);
  const [installed, setInstalled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchMarketplace() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCategory) params.set("category", selectedCategory);
        if (searchQuery) params.set("search", searchQuery);
        if (sort) params.set("sort", sort);
        params.set("perPage", "50");

        const response = await fetch(`/api/marketplace?${params}`);
        const json = await response.json();
        if (response.ok && json.data?.items) {
          setListings(json.data.items);
        }
      } catch {
        // fallback to initial listings
      } finally {
        setLoading(false);
      }
    }

    if (searchQuery || selectedCategory || sort !== "popular") {
      fetchMarketplace();
    } else {
      setListings(initialListings);
    }
  }, [searchQuery, selectedCategory, sort, initialListings]);

  const categories = initialCategories.length > 0
    ? initialCategories
    : Array.from(new Set(listings.map((l) => l.category))).map((cat) => ({
        category: cat,
        count: listings.filter((l) => l.category === cat).length,
      }));

  return (
    <div className="space-y-8">
      <MarketplaceHero onSearch={setSearchQuery} />

      <FeaturedApps apps={featured} />

      <Tabs defaultValue="browse" className="space-y-6">
        <TabsList className="border-white/5 bg-[#1E293B]">
          <TabsTrigger value="browse" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300">
            Browse
          </TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300">
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse">
          <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
            <aside>
              <MarketplaceSidebar />
              <div className="mt-6">
                <MarketplaceFilters
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  sort={sort}
                  onSortChange={setSort}
                />
              </div>
            </aside>
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                </div>
              ) : (
                <IntegrationGrid
                  integrations={listings.map((l) => ({
                    integrationKey: l.integrationKey,
                    name: l.name,
                    description: l.description,
                    category: l.category,
                    featured: l.featured,
                    rating: l.averageRating,
                    installCount: l.installCount,
                  }))}
                  installed={installed}
                  onInstall={(key) => setInstalled((prev) => ({ ...prev, [key]: true }))}
                />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <MarketplaceCategories
            categories={categories}
            selected={selectedCategory}
            onSelect={(cat) => {
              setSelectedCategory(cat);
              (document.querySelector('[data-value="browse"]') as HTMLElement)?.click();
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
