"use client";

export interface AgentConversation {
  id: string;
  title: string;
  messageCount: number;
  date: string;
}

interface ConversationHistoryProps {
  readonly conversations: AgentConversation[];
  readonly loading: boolean;
}

export function ConversationHistory({ conversations, loading }: ConversationHistoryProps) {
  if (loading) {
    return <div className="rounded-lg border p-4 text-sm text-gray-500">Loading conversations...</div>;
  }

  return (
    <div className="rounded-lg border p-4 flex flex-col gap-3">
      <h3 className="font-semibold text-lg">Conversations</h3>
      {conversations.length === 0 && (
        <p className="text-sm text-gray-500">No conversations found.</p>
      )}
      <div className="flex flex-col gap-2">
        {conversations.map((conv) => (
          <div key={conv.id} className="border rounded p-3 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h4 className="font-medium text-sm">{conv.title}</h4>
              <span className="text-xs text-gray-500">{conv.messageCount} messages</span>
            </div>
            <span className="text-xs text-gray-400">{conv.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
