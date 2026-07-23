"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MarketplaceFiltersProps {
  categories: Array<{ category: string; count: number }>;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  sort: string;
  onSortChange: (sort: string) => void;
}

const sortOptions = [
  { value: "popular", label: "Most Popular" },
  { value: "rating", label: "Top Rated" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name" },
];

export function MarketplaceFilters({
  categories,
  selectedCategory,
  onSelectCategory,
  sort,
  onSortChange,
}: MarketplaceFiltersProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-white">Sort By</h3>
        <div className="space-y-1">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onSortChange(option.value)}
              className={cn(
                "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                sort === option.value
                  ? "bg-indigo-500/10 text-indigo-300"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-white">Categories</h3>
        <div className="space-y-1">
          <button
            onClick={() => onSelectCategory(null)}
            className={cn(
              "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
              !selectedCategory
                ? "bg-indigo-500/10 text-indigo-300"
                : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
            )}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.category}
              onClick={() => onSelectCategory(cat.category)}
              className={cn(
                "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                selectedCategory === cat.category
                  ? "bg-indigo-500/10 text-indigo-300"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              )}
            >
              <span className="capitalize">{cat.category.toLowerCase()}</span>
              <span className="ml-2 text-xs text-gray-600">({cat.count})</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
