"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Puzzle, CheckCircle, XCircle, Clock, Star, BarChart3,
  Loader2, Search, Filter, RefreshCw
} from "lucide-react";
import { useRouter } from "next/navigation";

interface AdminListing {
  id: string;
  integrationKey: string;
  name: string;
  description: string;
  category: string;
  status: string;
  featured: boolean;
  featuredUntil: string | null;
  installCount: number;
  reviewCount: number;
  averageRating: number;
  createdAt: string;
  approvedAt: string | null;
  publishedAt: string | null;
}

interface AdminCategory {
  id: string;
  key: string;
  name: string;
  icon: string;
  sortOrder: number;
}

interface AdminMarketplaceProps {
  listings: AdminListing[];
  categories: AdminCategory[];
  stats: {
    total: number;
    approved: number;
    pending: number;
    draft: number;
    featured: number;
    reviews: number;
  };
}

const statusColors: Record<string, string> = {
  DRAFT: "text-gray-400 bg-gray-500/10",
  PENDING_REVIEW: "text-yellow-400 bg-yellow-500/10",
  APPROVED: "text-green-400 bg-green-500/10",
  REJECTED: "text-red-400 bg-red-500/10",
  ARCHIVED: "text-orange-400 bg-orange-500/10",
};

export function AdminMarketplace({ listings, categories, stats }: AdminMarketplaceProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [updating, setUpdating] = useState<string | null>(null);

  const filtered = listings
    .filter((l) => !search || l.name.toLowerCase().includes(search.toLowerCase()))
    .filter((l) => statusFilter === "ALL" || l.status === statusFilter);

  async function updateStatus(id: string, status: string, featured?: boolean) {
    setUpdating(id);
    try {
      await fetch("/api/admin/marketplace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, featured }),
      });
      router.refresh();
    } catch {
      alert("Failed to update listing");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Marketplace Administration</h1>
        <p className="mt-1 text-sm text-gray-400">Manage listings, reviews, and categories</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-white/5 bg-[#1E293B] p-4">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-gray-400">Total Listings</p>
        </Card>
        <Card className="border-white/5 bg-[#1E293B] p-4">
          <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
          <p className="text-xs text-gray-400">Approved</p>
        </Card>
        <Card className="border-white/5 bg-[#1E293B] p-4">
          <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
          <p className="text-xs text-gray-400">Pending Review</p>
        </Card>
        <Card className="border-white/5 bg-[#1E293B] p-4">
          <p className="text-2xl font-bold text-indigo-400">{stats.reviews}</p>
          <p className="text-xs text-gray-400">Total Reviews</p>
        </Card>
      </div>

      <Tabs defaultValue="listings" className="space-y-4">
        <TabsList className="border-white/5 bg-[#1E293B]">
          <TabsTrigger value="listings" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300">
            Listings
          </TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300">
            Categories
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300">
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search listings..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#1E293B] py-2 pl-9 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500/50 focus:outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#1E293B] px-3 py-2 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div className="space-y-2">
              {filtered.map((listing) => (
                <Card key={listing.id} className="border-white/5 bg-[#1E293B] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Puzzle className="h-8 w-8 text-indigo-400" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white">{listing.name}</h3>
                          <Badge variant="outline" className={cn("border px-2 py-0 text-xs font-normal", statusColors[listing.status])}>
                            {listing.status.replace("_", " ")}
                          </Badge>
                          {listing.featured && (
                            <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs">
                              Featured
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {listing.installCount} installs · {listing.averageRating.toFixed(1)} rating · {listing.reviewCount} reviews
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {listing.status === "PENDING_REVIEW" && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus(listing.id, "APPROVED")}
                          disabled={updating === listing.id}
                          className="bg-green-600 hover:bg-green-500 text-white"
                        >
                          {updating === listing.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="mr-1 h-3.5 w-3.5" />}
                          Approve
                        </Button>
                      )}
                      {listing.status === "APPROVED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(listing.id, "DRAFT")}
                          disabled={updating === listing.id}
                          className="border-white/10 text-gray-300"
                        >
                          {updating === listing.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="mr-1 h-3.5 w-3.5" />}
                          Unpublish
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={listing.featured ? "default" : "outline"}
                        onClick={() => updateStatus(listing.id, listing.status, !listing.featured)}
                        disabled={updating === listing.id}
                        className={listing.featured ? "bg-yellow-600 hover:bg-yellow-500" : "border-white/10 text-gray-300"}
                      >
                        {listing.featured ? "Unfeature" : "Feature"}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {filtered.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500">No listings found</div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <Card className="border-white/5 bg-[#1E293B] p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Integration Categories</h3>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Puzzle className="h-5 w-5 text-indigo-400" />
                    <div>
                      <p className="text-sm font-medium text-white">{cat.name}</p>
                      <p className="text-xs text-gray-500">Key: {cat.key}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-white/10 text-gray-400">
                    Order: {cat.sortOrder}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="border-white/5 bg-[#1E293B] p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Marketplace Analytics</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-white/5 p-4">
                <p className="text-sm text-gray-400">Total Installations</p>
                <p className="text-2xl font-bold text-white">
                  {listings.reduce((sum, l) => sum + l.installCount, 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-white/5 p-4">
                <p className="text-sm text-gray-400">Total Reviews</p>
                <p className="text-2xl font-bold text-white">{stats.reviews.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-white/5 p-4">
                <p className="text-sm text-gray-400">Featured Integrations</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.featured}</p>
              </div>
              <div className="rounded-lg bg-white/5 p-4">
                <p className="text-sm text-gray-400">Average Rating</p>
                <p className="text-2xl font-bold text-white">
                  {listings.length > 0
                    ? (listings.reduce((sum, l) => sum + l.averageRating, 0) / listings.length).toFixed(1)
                    : "N/A"}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
