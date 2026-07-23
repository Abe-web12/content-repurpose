"use client";

import { useState, useCallback } from "react";
import { showError } from "@/components/ui/toast";

export interface RAGCitation {
  chunkId: string;
  content: string;
  score: number;
  documentTitle: string;
  source: string | null;
}

export interface RAGResult {
  answer: string;
  citations: RAGCitation[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latency: number;
}

export function useRAG() {
  const [querying, setQuerying] = useState(false);

  const query = useCallback(async (data: {
    query: string;
    knowledgeBaseIds: string[];
    provider?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    topK?: number;
    minScore?: number;
    includeCitations?: boolean;
  }) => {
    setQuerying(true);
    try {
      const res = await fetch("/api/rag/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "RAG query failed");
      return json.data as RAGResult;
    } catch (err: any) {
      showError(err.message);
      throw err;
    } finally {
      setQuerying(false);
    }
  }, []);

  return { query, querying };
}
