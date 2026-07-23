"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface MarketplaceSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MarketplaceSearch({ value, onChange, placeholder = "Search integrations..." }: MarketplaceSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-white/10 bg-[#1E293B] pl-9 text-white placeholder:text-gray-500 focus:border-indigo-500/50"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
