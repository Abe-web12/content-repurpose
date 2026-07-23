"use client";

import { useCallback, useEffect, useState } from "react";
import type { VoiceProfile } from "@/lib/types/index";
import { showError, showSuccess } from "@/components/ui/toast";

export function useVoiceProfiles() {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async (params?: { search?: string; sort?: string; favorites?: boolean }) => {
    setLoading(true);

    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.sort) searchParams.set("sort", params.sort);
    if (params?.favorites) searchParams.set("favorites", "true");

    const url = `/api/voice${searchParams.toString() ? `?${searchParams}` : ""}`;
    const response = await fetch(url);
    const json = await response.json();

    if (response.ok) {
      setProfiles(json.data || []);
    } else {
      showError(json.error || "Failed to load voice profiles");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  async function createProfile(data: any) {
    const response = await fetch("/api/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await response.json();

    if (!response.ok) {
      showError(typeof json.error === "string" ? json.error : "Failed to create voice profile");
      return null;
    }

    showSuccess("Voice profile created");
    await fetchProfiles();
    return json.data;
  }

  async function updateProfile(id: string, data: any) {
    const response = await fetch("/api/voice", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });

    const json = await response.json();

    if (!response.ok) {
      showError(typeof json.error === "string" ? json.error : "Failed to update");
      return null;
    }

    showSuccess("Voice profile updated");
    await fetchProfiles();
    return json.data;
  }

  async function deleteProfile(id: string) {
    const response = await fetch(`/api/voice?id=${id}`, { method: "DELETE" });
    const json = await response.json();

    if (!response.ok) {
      showError(json.error || "Failed to delete");
      return false;
    }

    showSuccess("Voice profile deleted");
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    return true;
  }

  async function duplicateProfile(id: string) {
    const original = profiles.find((p) => p.id === id);
    if (!original) return null;
    return createProfile({
      name: `${original.name} (Copy)`,
      description: original.description,
      tone: original.tone,
      example_posts: original.example_posts,
      is_default: false,
    });
  }

  async function toggleFavorite(id: string) {
    const res = await fetch("/api/voice", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "toggle_favorite" }),
    });
    const json = await res.json();
    if (res.ok) {
      await fetchProfiles();
    }
    return json;
  }

  async function setDefault(id: string) {
    const res = await fetch("/api/voice", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "set_default" }),
    });
    if (res.ok) {
      showSuccess("Default voice updated");
      await fetchProfiles();
    }
    return res.ok;
  }

  const defaultProfile = profiles.find((p) => p.is_default) || profiles[0] || null;

  return {
    profiles,
    loading,
    defaultProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    duplicateProfile,
    toggleFavorite,
    setDefault,
    refetch: fetchProfiles,
  };
}
