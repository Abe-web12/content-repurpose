"use client";

import { useState, useCallback, useEffect } from "react";
import { showError } from "@/components/ui/toast";

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  chunkingStrategy: string | null;
  chunkSize: number;
  chunkOverlap: number;
  embeddingModel: string | null;
  documents?: KnowledgeDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocument {
  id: string;
  knowledgeBaseId: string;
  title: string;
  source: string | null;
  sourceType: string;
  content: string;
  fileSize: number | null;
  fileType: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  chunkCount?: number;
  createdAt: string;
}

export interface SearchResult {
  chunkId: string;
  content: string;
  score: number;
  documentTitle: string;
  source: string | null;
}

export function useKnowledgeBases() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKnowledgeBases = useCallback(async (params?: Record<string, string>) => {
    setLoading(true);
    try {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      const res = await fetch(`/api/knowledge${qs}`);
      const json = await res.json();
      if (res.ok) setKnowledgeBases(json.data || []);
      else showError(json.error || "Failed to load knowledge bases");
    } catch (err: any) {
      showError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  const createKnowledgeBase = useCallback(async (data: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create knowledge base");
      setKnowledgeBases((prev) => [json.data, ...prev]);
      return json.data;
    } catch (err: any) {
      showError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => { fetchKnowledgeBases(); }, [fetchKnowledgeBases]);

  return { knowledgeBases, loading, refetch: fetchKnowledgeBases, createKnowledgeBase };
}

export function useKnowledgeBase(knowledgeBaseId: string | null) {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchKnowledgeBase = useCallback(async () => {
    if (!knowledgeBaseId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge/${knowledgeBaseId}`);
      const json = await res.json();
      if (res.ok) setKnowledgeBase(json.data);
      else showError(json.error || "Failed to load knowledge base");
    } catch (err: any) {
      showError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [knowledgeBaseId]);

  const deleteKnowledgeBase = useCallback(async () => {
    try {
      const res = await fetch(`/api/knowledge/${knowledgeBaseId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete");
      }
    } catch (err: any) {
      showError(err.message);
      throw err;
    }
  }, [knowledgeBaseId]);

  useEffect(() => { fetchKnowledgeBase(); }, [fetchKnowledgeBase]);

  return { knowledgeBase, loading, refetch: fetchKnowledgeBase, deleteKnowledgeBase };
}

export function useDocuments(knowledgeBaseId: string | null) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!knowledgeBaseId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge/${knowledgeBaseId}/documents`);
      const json = await res.json();
      if (res.ok) setDocuments(json.data || []);
      else showError(json.error || "Failed to load documents");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [knowledgeBaseId]);

  const uploadDocument = useCallback(async (data: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/knowledge/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to upload document");
      setDocuments((prev) => [...prev, json.data]);
      return json.data;
    } catch (err: any) {
      showError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  return { documents, loading, refetch: fetchDocuments, uploadDocument };
}

export function useKnowledgeSearch() {
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (query: string, knowledgeBaseId: string) => {
    setSearching(true);
    try {
      const res = await fetch("/api/knowledge/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, knowledgeBaseId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Search failed");
      return json.data as SearchResult[];
    } catch (err: any) {
      showError(err.message);
      throw err;
    } finally {
      setSearching(false);
    }
  }, []);

  return { search, searching };
}
