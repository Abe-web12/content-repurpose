"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Generation } from "@/lib/types/index";
import { showError, showSuccess } from "@/components/ui/toast";

interface UseGenerationsOptions {
  limit?: number;
  format?: string;
  favorites?: boolean;
  trash?: boolean;
  search?: string;
  sort?: string;
  subscribe?: boolean;
}

export function useGenerations(options: UseGenerationsOptions = {}) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const fetchGenerations = useCallback(async (reset = false) => {
    setLoading(true);

    const params = new URLSearchParams();
    params.set("limit", String(optionsRef.current.limit || 20));
    params.set("offset", String(reset ? 0 : offsetRef.current));

    if (optionsRef.current.format) {
      params.set("format", optionsRef.current.format);
    }
    if (optionsRef.current.favorites) {
      params.set("favorites", "true");
    }
    if (optionsRef.current.trash) {
      params.set("trash", "true");
    }
    if (optionsRef.current.search) {
      params.set("search", optionsRef.current.search);
    }
    if (optionsRef.current.sort) {
      params.set("sort", optionsRef.current.sort);
    }

    try {
      const response = await fetch(`/api/generations?${params}`);
      const json = await response.json();

      if (!response.ok) {
        showError(json.error || "Failed to load generations");
        return;
      }

      setGenerations((prev) => (reset ? (json.data || []) : [...prev, ...(json.data || [])]));
      setHasMore(json.data && json.data.length === (optionsRef.current.limit || 20));
      if (!reset) {
        offsetRef.current += optionsRef.current.limit || 20;
      } else {
        offsetRef.current = (optionsRef.current.limit || 20);
      }
    } catch (err: any) {
      showError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    offsetRef.current = 0;
    fetchGenerations(true);
  }, [fetchGenerations]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchGenerations(false);
    }
  }, [loading, hasMore, fetchGenerations]);

  useEffect(() => {
    refresh();
  }, [refresh, options.format, options.favorites, options.trash, options.search, options.sort]);

  useEffect(() => {
    if (!options.subscribe) return;

    const interval = setInterval(() => {
      offsetRef.current = 0;
      fetchGenerations(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [options.subscribe, fetchGenerations]);

  return {
    generations,
    loading,
    hasMore,
    refresh,
    loadMore,
  };
}

export async function toggleFavorite(id: string) {
  const response = await fetch(`/api/generations/${id}/favorite`, {
    method: "PATCH",
  });
  const json = await response.json();

  if (!response.ok) {
    showError(json.error || "Failed to update favorite");
    return null;
  }

  return json.data;
}

export async function deleteGeneration(id: string, permanent = false) {
  const response = await fetch(`/api/generations/${id}?permanent=${permanent}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const json = await response.json();
    showError(json.error || "Failed to delete generation");
    return false;
  }

  return true;
}

export async function restoreGeneration(id: string) {
  const response = await fetch(`/api/generations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "restore" }),
  });

  if (!response.ok) {
    showError("Failed to restore generation");
    return false;
  }

  showSuccess("Generation restored");
  return true;
}

export async function duplicateGeneration(id: string) {
  const response = await fetch(`/api/generations/${id}/duplicate`, {
    method: "POST",
  });
  const json = await response.json();

  if (!response.ok) {
    showError(json.error || "Failed to duplicate");
    return null;
  }

  showSuccess("Generation duplicated");
  return json.data;
}

export async function fetchGeneration(id: string): Promise<Generation | null> {
  try {
    const response = await fetch(`/api/generations/${id}`);
    const json = await response.json();

    if (!response.ok) {
      showError(json.error || "Failed to load generation");
      return null;
    }

    return json.data;
  } catch (err: any) {
    showError(err.message || "Network error");
    return null;
  }
}
