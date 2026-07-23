"use client";

import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HistoryFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  format: string;
  onFormatChange: (value: string) => void;
  showFavorites: boolean;
  onFavoritesToggle: () => void;
}

export function HistoryFilters({
  search,
  onSearchChange,
  format,
  onFormatChange,
  showFavorites,
  onFavoritesToggle,
}: HistoryFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          placeholder="Search generations..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex items-center gap-3">
        <Select value={format} onValueChange={onFormatChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All formats" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All formats</SelectItem>
            <SelectItem value="linkedin_post">LinkedIn Post</SelectItem>
            <SelectItem value="linkedin_carousel">Carousel</SelectItem>
            <SelectItem value="twitter_thread">Twitter Thread</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={showFavorites ? "default" : "outline"}
          size="sm"
          onClick={onFavoritesToggle}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Favorites
        </Button>
      </div>
    </div>
  );
}
