"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Puzzle, Star, Clock, TrendingUp } from "lucide-react";
import Link from "next/link";

export function MarketplaceSidebar() {
  return (
    <div className="space-y-4">
      <Card className="border-white/5 bg-[#1E293B] p-4">
        <h3 className="text-sm font-semibold text-white">Quick Links</h3>
        <div className="mt-3 space-y-2">
          <Link
            href="/marketplace?sort=popular"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
          >
            <TrendingUp className="h-4 w-4" />
            Most Popular
          </Link>
          <Link
            href="/marketplace?sort=rating"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
          >
            <Star className="h-4 w-4" />
            Top Rated
          </Link>
          <Link
            href="/marketplace?sort=newest"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
          >
            <Clock className="h-4 w-4" />
            Recently Added
          </Link>
          <Link
            href="/integrations"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
          >
            <Puzzle className="h-4 w-4" />
            My Integrations
          </Link>
        </div>
      </Card>
    </div>
  );
}
