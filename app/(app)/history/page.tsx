"use client";

import { useState, useCallback } from "react";
import {
  Clock, Search, SlidersHorizontal, Trash2, RotateCcw, Copy, Archive,
  Heart, ArrowUpDown,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { HistoryFilters } from "@/components/history/history-filters";
import { GenerationCard } from "@/components/history/generation-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useGenerations, toggleFavorite, deleteGeneration,
  restoreGeneration, duplicateGeneration,
} from "@/hooks/use-generations";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { showSuccess } from "@/components/ui/toast";
import type { Generation } from "@/lib/types/index";

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState("all");
  const [showFavorites, setShowFavorites] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [sort, setSort] = useState("newest");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; permanent: boolean } | null>(null);

  const { generations, loading, refresh, loadMore, hasMore } = useGenerations({
    format: format === "all" ? undefined : format,
    favorites: showFavorites || undefined,
    trash: showTrash || undefined,
    search: search || undefined,
    sort: sort || undefined,
  });

  const handleToggleFavorite = useCallback(async (id: string) => {
    await toggleFavorite(id);
    refresh();
  }, [refresh]);

  const handleDelete = useCallback(async (id: string) => {
    setDeleteTarget({ id, permanent: false });
  }, []);

  const handlePermanentDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const success = await deleteGeneration(deleteTarget.id, deleteTarget.permanent);
    if (success) refresh();
    setDeleteTarget(null);
  }, [deleteTarget, refresh]);

  const handleRestore = useCallback(async (id: string) => {
    const success = await restoreGeneration(id);
    if (success) refresh();
  }, [refresh]);

  const handleDuplicate = useCallback(async (id: string) => {
    await duplicateGeneration(id);
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-10">
      <PageHeader
        title="History"
        description="All your past generations in one place."
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Search generations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showFavorites ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFavorites(!showFavorites)}
            className="gap-2"
          >
            <Heart className={`h-4 w-4 ${showFavorites ? "fill-current" : ""}`} />
            Favorites
          </Button>
          <Button
            variant={showTrash ? "default" : "outline"}
            size="sm"
            onClick={() => setShowTrash(!showTrash)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Trash
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                {sort === "newest" ? "Newest" : "Oldest"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSort("newest")}>Newest First</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("oldest")}>Oldest First</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <HistoryFilters
        search={search}
        onSearchChange={setSearch}
        format={format}
        onFormatChange={setFormat}
        showFavorites={showFavorites}
        onFavoritesToggle={() => setShowFavorites((prev) => !prev)}
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : generations.length === 0 ? (
        <EmptyState
          icon={showTrash ? <Archive className="h-10 w-10" /> : <Clock className="h-10 w-10" />}
          title={showTrash ? "Trash is empty" : "No generations found"}
          description={
            showTrash
              ? "Deleted generations will appear here."
              : search || format !== "all" || showFavorites
                ? "Try adjusting your filters."
                : "Your saved content will appear here after you generate something."
          }
          action={
            !search && format === "all" && !showFavorites && !showTrash ? (
              <Button asChild>
                <a href="/generate">Create your first generation</a>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {generations.map((gen: any) => (
              <Card key={gen.id} className={`relative ${gen.deleted_at ? "opacity-60" : ""}`}>
                <GenerationCard
                  generation={gen}
                  onToggleFavorite={() => handleToggleFavorite(gen.id)}
                  onDelete={() => handleDelete(gen.id)}
                />
                {gen.deleted_at && (
                  <CardContent className="pt-0">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(gen.id)}
                        className="gap-1.5 text-xs flex-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget({ id: gen.id, permanent: true })}
                        className="gap-1.5 text-xs text-red-600 flex-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete forever
                      </Button>
                    </div>
                  </CardContent>
                )}
                {!gen.deleted_at && (
                  <CardContent className="pt-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(gen.id)}
                      className="gap-1.5 text-xs"
                    >
                      <Copy className="h-3 w-3" />
                      Duplicate
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={loadMore} disabled={loading}>
                {loading ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={deleteTarget?.permanent ? "Delete permanently" : "Move to trash"}
        description={
          deleteTarget?.permanent
            ? "This action cannot be undone. The generation will be permanently deleted."
            : "This generation will be moved to trash. You can restore it later."
        }
        confirmLabel={deleteTarget?.permanent ? "Delete forever" : "Move to trash"}
        destructive
        onConfirm={handlePermanentDelete}
      />
    </div>
  );
}
