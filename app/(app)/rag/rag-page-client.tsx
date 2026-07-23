"use client";

import { useRAG } from "@/hooks/use-rag";
import { useKnowledgeBases } from "@/hooks/use-knowledge";
import { RagQuery } from "@/components/studio/rag-query";

export function RAGPageClient() {
  const { knowledgeBases, loading } = useKnowledgeBases();
  const { query: runQuery } = useRAG();

  return (
    <div className="space-y-6">
      <RagQuery
        knowledgeBases={knowledgeBases as any}
        onQuery={async (params: any) => {
          const result = await runQuery({
            query: params.query,
            knowledgeBaseIds: params.knowledgeBaseIds,
            provider: params.provider,
            model: params.model,
            systemPrompt: params.systemPrompt,
            topK: params.topK,
            minScore: params.minScore,
          });
          return result as any;
        }}
      />
    </div>
  );
}
