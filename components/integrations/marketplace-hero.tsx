"use client";

import { Search } from "lucide-react";

interface MarketplaceHeroProps {
  onSearch: (query: string) => void;
}

export function MarketplaceHero({ onSearch }: MarketplaceHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-gray-900 p-8 sm:p-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
      <div className="relative">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Integration Marketplace</h1>
        <p className="mt-2 max-w-2xl text-gray-400">
          Connect your favorite tools and services to automate your content workflow.
          Browse, install, and manage integrations all in one place.
        </p>
        <div className="mt-6 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search integrations..."
              onChange={(e) => onSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#1E293B] py-3 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
