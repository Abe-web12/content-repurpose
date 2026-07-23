"use client";

import { useState } from "react";

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: string;
}

interface AgentChatProps {
  readonly messages: AgentMessage[];
  readonly onSend: (message: string) => void;
  readonly loading: boolean;
}

function RoleBadge({ role }: { readonly role: AgentMessage["role"] }) {
  const color =
    role === "user" ? "#2563eb"
    : role === "assistant" ? "#16a34a"
    : role === "system" ? "#ca8a04"
    : "#6b7280";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 6px",
        fontSize: "0.7rem",
        fontWeight: 600,
        borderRadius: "9999px",
        color: "#fff",
        backgroundColor: color,
      }}
    >
      {role}
    </span>
  );
}

export function AgentChat({ messages, onSend, loading }: AgentChatProps) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim() && !loading) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="rounded-lg border p-4 flex flex-col gap-3 h-96">
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <RoleBadge role={msg.role} />
              <span className="text-xs text-gray-400">{msg.timestamp}</span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 border rounded px-3 py-2 text-sm"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
