"use client";

import { useState, useCallback, useEffect } from "react";
import { showError, showSuccess } from "@/components/ui/toast";

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  platform: string;
  content: string;
  is_custom: boolean;
  user_id: string | null;
  created_at: string;
}

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async (params?: { category?: string; platform?: string }) => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set("category", params.category);
      if (params?.platform) searchParams.set("platform", params.platform);

      const url = `/api/templates${searchParams.toString() ? `?${searchParams}` : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) {
        setTemplates(json.data || []);
      } else {
        showError(json.error || "Failed to load templates");
      }
    } catch (err: any) {
      showError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = useCallback(async (data: {
    name: string;
    description?: string;
    category?: string;
    platform?: string;
    content: string;
  }) => {
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      showError(typeof json.error === "string" ? json.error : "Failed to create template");
      return null;
    }
    showSuccess("Template saved");
    await fetchTemplates();
    return json.data;
  }, [fetchTemplates]);

  const deleteTemplate = useCallback(async (id: string) => {
    const res = await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      showError("Failed to delete template");
      return false;
    }
    showSuccess("Template deleted");
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    return true;
  }, []);

  return {
    templates,
    loading,
    createTemplate,
    deleteTemplate,
    refetch: fetchTemplates,
  };
}
