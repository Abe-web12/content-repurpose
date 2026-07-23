"use client";

import { useState, useEffect } from "react";
import { Palette, Globe, Image, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface OrgBrandingSummary {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  brandColor: string | null;
  domain: string | null;
  domainVerified: boolean;
  _count: { members: number };
}

export default function AdminBrandingPage() {
  const [orgs, setOrgs] = useState<OrgBrandingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    window.fetch("/api/organizations")
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json.data)) setOrgs(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Organization Branding</h1>
          <p className="text-text-muted mt-1">Manage branding across all organizations</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <Input
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 max-w-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-12 w-12 rounded-lg mb-3" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24 mb-3" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Palette className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-sm text-text-muted">No organizations found</p>
          </div>
        ) : (
          filtered.map((org) => (
            <Card key={org.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-12 w-12 rounded-lg bg-brand-100 flex items-center justify-center overflow-hidden">
                    {org.logo ? (
                      <img src={org.logo} alt={org.name} className="h-full w-full object-contain" />
                    ) : (
                      <Palette className="h-6 w-6 text-brand-600" />
                    )}
                  </div>
                  {org.brandColor && (
                    <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: org.brandColor }} />
                  )}
                </div>
                <h3 className="font-semibold text-text-primary">{org.name}</h3>
                <p className="text-xs text-text-muted mb-3">{org.slug} &middot; {org._count.members} members</p>
                <div className="flex gap-2">
                  {org.domain ? (
                    <Badge variant={org.domainVerified ? "default" : "outline"} className="text-xs gap-1">
                      <Globe className="h-3 w-3" />
                      {org.domain}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">No domain</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
