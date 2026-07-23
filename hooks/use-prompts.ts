"use client";

import { useState, useCallback, useEffect } from "react";
import { showError } from "@/components/ui/toast";

export interface PromptTemplate {
  id: string;
  name: string;
  description: string | null;
  content: string;
  status: string;
  categoryId: string | null;
  tags: string[];
  version: number;
  isFavorite: boolean;
  variables: PromptVariable[];
  category?: { id: string; name: string; color: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromptVariable {
  id: string;
  name: string;
  label: string | null;
  type: string;
  defaultValue: string | null;
  required: boolean;
  options: string[];
  sortOrder: number;
}

export interface PromptVersion {
  id: string;
  version: number;
  content: string;
  status: string;
  createdAt: string;
}

export interface PromptCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface PromptExecution {
  id: string;
  promptId: string;
  provider: string;
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  systemPrompt: string | null;
  userPrompt: string;
  output: string | null;
  latency: number | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  rating: number | null;
  feedback: string | null;
  success: boolean;
  createdAt: string;
}

export function usePrompts() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrompts = useCallback(async (params?: Record<string, string>) => {
    setLoading(true);
    try {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      const res = await fetch(`/api/prompts${qs}`);
      const json = await res.json();
      if (res.ok) setPrompts(json.data || []);
      else showError(json.error || "Failed to load prompts");
    } catch (err: any) {
      showError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  const createPrompt = useCallback(async (data: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create prompt");
      setPrompts((prev) => [json.data, ...prev]);
      return json.data;
    } catch (err: any) {
      showError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

  return { prompts, loading, refetch: fetchPrompts, createPrompt };
}

export function usePrompt(promptId: string | null) {
  const [prompt, setPrompt] = useState<PromptTemplate | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPrompt = useCallback(async () => {
    if (!promptId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/prompts/${promptId}`);
      const json = await res.json();
      if (res.ok) setPrompt(json.data);
      else showError(json.error || "Failed to load prompt");
    } catch (err: any) {
      showError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [promptId]);

  const updatePrompt = useCallback(async (data: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/prompts/${promptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update prompt");
      setPrompt(json.data);
      return json.data;
    } catch (err: any) {
      showError(err.message);
      throw err;
    }
  }, [promptId]);

  const deletePrompt = useCallback(async () => {
    try {
      const res = await fetch(`/api/prompts/${promptId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete prompt");
      }
    } catch (err: any) {
      showError(err.message);
      throw err;
    }
  }, [promptId]);

  useEffect(() => { fetchPrompt(); }, [fetchPrompt]);

  return { prompt, loading, refetch: fetchPrompt, updatePrompt, deletePrompt };
}

export function usePromptVersions(promptId: string | null) {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVersions = useCallback(async () => {
    if (!promptId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/prompts/${promptId}/versions`);
      const json = await res.json();
      if (res.ok) setVersions(json.data || []);
      else showError(json.error || "Failed to load versions");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [promptId]);

  const createVersion = useCallback(async (content: string) => {
    try {
      const res = await fetch(`/api/prompts/${promptId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create version");
      setVersions((prev) => [...prev, json.data]);
      return json.data;
    } catch (err: any) {
      showError(err.message);
      throw err;
    }
  }, [promptId]);

  useEffect(() => { fetchVersions(); }, [fetchVersions]);

  return { versions, loading, refetch: fetchVersions, createVersion };
}

export function usePromptRun() {
  const [running, setRunning] = useState(false);

  const runPrompt = useCallback(async (data: Record<string, unknown>) => {
    setRunning(true);
    try {
      const res = await fetch("/api/prompts/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to run prompt");
      return json.data;
    } catch (err: any) {
      showError(err.message);
      throw err;
    } finally {
      setRunning(false);
    }
  }, []);

  return { runPrompt, running };
}

export function usePromptCompare() {
  const [comparing, setComparing] = useState(false);

  const comparePrompts = useCallback(async (runs: Record<string, unknown>[]) => {
    setComparing(true);
    try {
      const res = await fetch("/api/prompts/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runs }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to compare prompts");
      return json.data;
    } catch (err: any) {
      showError(err.message);
      throw err;
    } finally {
      setComparing(false);
    }
  }, []);

  return { comparePrompts, comparing };
}

export function usePromptCategories() {
  const [categories, setCategories] = useState<PromptCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/prompts/categories");
      const json = await res.json();
      if (res.ok) setCategories(json.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  return { categories, loading, refetch: fetchCategories };
}

export function useToggleFavorite() {
  const toggleFavorite = useCallback(async (promptId: string) => {
    try {
      const res = await fetch(`/api/prompts/${promptId}/favorite`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to toggle favorite");
      return json.data;
    } catch (err: any) {
      showError(err.message);
      throw err;
    }
  }, []);

  return { toggleFavorite };
}

export function useClonePrompt() {
  const clonePrompt = useCallback(async (promptId: string) => {
    try {
      const res = await fetch(`/api/prompts/${promptId}/clone`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to clone prompt");
      return json.data;
    } catch (err: any) {
      showError(err.message);
      throw err;
    }
  }, []);

  return { clonePrompt };
}
