"use client";

export interface AgentKnowledgeBase {
  id: string;
  name: string;
  description: string;
  documentCount: number;
}

interface KnowledgeManagerProps {
  readonly knowledgeBases: AgentKnowledgeBase[];
  readonly loading: boolean;
}

export function KnowledgeManager({ knowledgeBases, loading }: KnowledgeManagerProps) {
  if (loading) {
    return <div className="rounded-lg border p-4 text-sm text-gray-500">Loading knowledge bases...</div>;
  }

  return (
    <div className="rounded-lg border p-4 flex flex-col gap-3">
      <h3 className="font-semibold text-lg">Knowledge Bases</h3>
      {knowledgeBases.length === 0 && (
        <p className="text-sm text-gray-500">No knowledge bases found.</p>
      )}
      <div className="flex flex-col gap-2">
        {knowledgeBases.map((kb) => (
          <div key={kb.id} className="border rounded p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{kb.name}</h4>
              <span className="text-xs text-gray-500">{kb.documentCount} documents</span>
            </div>
            <p className="text-sm text-gray-600">{kb.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
