"use client";

import { useState } from "react";

export interface AgentFormData {
  name: string;
  description: string;
  systemPrompt: string;
  model: string;
  provider: string;
  temperature: number;
  maxTokens: number;
}

interface AgentBuilderProps {
  readonly initialData?: Partial<AgentFormData>;
  readonly onSave: (data: AgentFormData) => void;
}

const MODELS = ["gpt-4", "gpt-3.5-turbo", "claude-3", "gemini-pro"];
const PROVIDERS = ["openai", "anthropic", "google"];

export function AgentBuilder({ initialData, onSave }: AgentBuilderProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [systemPrompt, setSystemPrompt] = useState(initialData?.systemPrompt ?? "");
  const [model, setModel] = useState(initialData?.model ?? MODELS[0]);
  const [provider, setProvider] = useState(initialData?.provider ?? PROVIDERS[0]);
  const [temperature, setTemperature] = useState(initialData?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(initialData?.maxTokens ?? 2048);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, description, systemPrompt, model, provider, temperature, maxTokens });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border p-4 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">System Prompt</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={4}
          className="border rounded px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            {MODELS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Temperature ({temperature})</label>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Max Tokens</label>
          <input
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
            className="border rounded px-3 py-2 text-sm"
            min={1}
          />
        </div>
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm self-start"
      >
        Save
      </button>
    </form>
  );
}
