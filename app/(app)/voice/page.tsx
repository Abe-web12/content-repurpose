"use client";

import { useState } from "react";
import { Mic2, Plus, Search, SlidersHorizontal, Star, Copy, Trash2, Heart, Check } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { VoiceForm } from "@/components/voice/voice-form";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVoiceProfiles } from "@/hooks/use-voice-profiles";
import { showSuccess } from "@/components/ui/toast";

export default function VoicePage() {
  const {
    profiles, loading, createProfile, deleteProfile,
    duplicateProfile, toggleFavorite, setDefault, refetch,
  } = useVoiceProfiles();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const filtered = profiles.filter((p) => {
    if (favoritesOnly && !p.is_favorite) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.tone?.toLowerCase().includes(q);
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.is_default) return -1;
    if (b.is_default) return 1;
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  async function handleCreate(data: any) {
    const result = await createProfile(data);
    if (result) setShowCreate(false);
    return result;
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteProfile(deleteTarget);
    setDeleteTarget(null);
  }

  if (loading) {
    return (
      <div className="space-y-10">
        <PageHeader title="Voice Profiles" />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Voice Profiles"
        description="Create profiles from your writing style so generated content sounds like you."
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            New profile
          </Button>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Search profiles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={favoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className="gap-2"
          >
            <Heart className={`h-4 w-4 ${favoritesOnly ? "fill-current" : ""}`} />
            Favorites
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                {sort === "newest" ? "Newest" : sort === "oldest" ? "Oldest" : "Name"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSort("newest")}>Newest</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("oldest")}>Oldest</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("name")}>Name (A-Z)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {profiles.length === 0 ? (
        <EmptyState
          icon={<Mic2 className="h-10 w-10" />}
          title="No voice profiles yet"
          description="Add writing examples so the AI can match your tone and style."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              Create your first profile
            </Button>
          }
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<Mic2 className="h-10 w-10" />}
          title="No matching profiles"
          description="Try adjusting your search or filters."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((profile) => (
            <Card key={profile.id} className={`relative ${profile.is_default ? "ring-2 ring-brand-500" : ""}`}>
              {profile.is_default && (
                <div className="absolute right-3 top-3 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-600">
                  Default
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
                      <Mic2 className="h-4 w-4 text-brand-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{profile.name}</CardTitle>
                      <span className="text-xs text-text-muted capitalize">{profile.tone}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFavorite(profile.id)}
                    className={`rounded-lg p-1.5 transition-colors ${
                      profile.is_favorite
                        ? "text-red-500 hover:bg-red-50"
                        : "text-text-muted hover:bg-surface-2"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${profile.is_favorite ? "fill-current" : ""}`} />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-2 text-xs text-text-secondary">
                  {profile.description || "No description"}
                </p>
                {profile.example_posts && profile.example_posts.length > 0 && (
                  <p className="mt-2 text-[10px] text-text-muted">
                    {profile.example_posts.length} example{profile.example_posts.length !== 1 ? "s" : ""}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  {!profile.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDefault(profile.id)}
                      className="gap-1.5 text-xs"
                    >
                      <Check className="h-3 w-3" />
                      Set default
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="ml-auto">
                        <SlidersHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        duplicateProfile(profile.id);
                        showSuccess("Profile duplicated");
                      }} className="gap-2">
                        <Copy className="h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(profile.id)}
                        className="gap-2 text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create voice profile</DialogTitle>
            <DialogDescription>
              Add your writing examples so generated content matches your style.
            </DialogDescription>
          </DialogHeader>
          <VoiceForm onSubmit={handleCreate} submitLabel="Create profile" />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete voice profile"
        description="This action cannot be undone. Are you sure you want to delete this profile?"
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
