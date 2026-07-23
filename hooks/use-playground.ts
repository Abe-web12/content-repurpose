"use client";

import { useState, useCallback } from "react";
import { showError } from "@/components/ui/toast";

export interface PlaygroundConfig {
  provider: string;
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  systemPrompt: string;
  userPrompt: string;
}

export interface PlaygroundResult {
  output: string;
  latency: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  provider: string;
  model: string;
}

export function usePlayground() {
  const [running, setRunning] = useState(false);

  const execute = useCallback(async (config: PlaygroundConfig) => {
    setRunning(true);
    try {
      const res = await fetch("/api/prompts/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId: "playground",
          provider: config.provider,
          model: config.model,
          temperature: config.temperature,
          topP: config.topP,
          maxTokens: config.maxTokens,
          systemPrompt: config.systemPrompt,
          userPrompt: config.userPrompt,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Execution failed");
      return json.data as PlaygroundResult;
    } catch (err: any) {
      showError(err.message);
      throw err;
    } finally {
      setRunning(false);
    }
  }, []);

  const compare = useCallback(async (configs: PlaygroundConfig[]) => {
    setRunning(true);
    try {
      const res = await fetch("/api/prompts/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runs: configs.map((c) => ({
            promptId: "playground",
            provider: c.provider,
            model: c.model,
            temperature: c.temperature,
            topP: c.topP,
            maxTokens: c.maxTokens,
            systemPrompt: c.systemPrompt,
            userPrompt: c.userPrompt,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Comparison failed");
      return json.data as PlaygroundResult[];
    } catch (err: any) {
      showError(err.message);
      throw err;
    } finally {
      setRunning(false);
    }
  }, []);

  return { execute, compare, running };
}

export const PROVIDERS = [
  { id: "openai", name: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"] },
  { id: "anthropic", name: "Anthropic", models: ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"] },
  { id: "gemini", name: "Gemini", models: ["gemini-1.5-flash", "gemini-1.5-pro"] },
  { id: "morphllm", name: "MorphLLM", models: ["gpt-4o-mini", "gpt-4o"] },
  { id: "groq", name: "Groq", models: ["llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768"] },
  { id: "mistral", name: "Mistral", models: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest"] },
  { id: "deepseek", name: "DeepSeek", models: ["deepseek-chat", "deepseek-coder"] },
  { id: "openrouter", name: "OpenRouter", models: ["openai/gpt-4o", "openai/gpt-4o-mini", "anthropic/claude-3-opus", "google/gemini-1.5-flash"] },
] as const;
