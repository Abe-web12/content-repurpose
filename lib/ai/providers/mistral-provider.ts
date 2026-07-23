import { ProviderInterface, ChatParams, ChatResult, StreamChunk, EmbeddingParams, EmbeddingResult, HealthCheckResult, CostEstimate, ModelCapability } from "../provider-interface";

const MISTRAL_PRICING: Record<string, { input: number; output: number }> = {
  "mistral-large-2407": { input: 4, output: 12 },
  "mistral-large-2411": { input: 2, output: 6 },
  "mistral-large-2501": { input: 2, output: 6 },
  "mistral-medium": { input: 2.7, output: 8.1 },
  "mistral-small": { input: 1, output: 3 },
  "mistral-small-2501": { input: 1, output: 3 },
  "open-mistral-nemo": { input: 0.3, output: 0.3 },
  "codestral": { input: 1, output: 3 },
  "mistral-embed": { input: 0.1, output: 0 },
};

export class MistralProvider implements ProviderInterface {
  readonly name = "mistral";
  readonly displayName = "Mistral AI";
  readonly type = "mistral";
  readonly capabilities: ModelCapability[] = ["chat", "stream", "embedding", "code", "function_calling"];

  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY || "";
    this.baseUrl = process.env.MISTRAL_BASE_URL || "https://api.mistral.ai/v1";
    this.defaultModel = process.env.MISTRAL_MODEL || "mistral-small-2501";
  }

  async chat(params: ChatParams): Promise<ChatResult> {
    const start = Date.now();
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: params.model || this.defaultModel,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens,
        top_p: params.topP,
        stop: params.stop,
      }),
    });
    if (!response.ok) throw new Error(`Mistral API error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || "",
      model: data.model || params.model || this.defaultModel,
      provider: this.name,
      usage: { promptTokens: data.usage?.prompt_tokens || 0, completionTokens: data.usage?.completion_tokens || 0, totalTokens: data.usage?.total_tokens || 0 },
      latency: Date.now() - start,
    };
  }

  async *stream(params: ChatParams): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: params.model || this.defaultModel,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens,
        top_p: params.topP,
        stop: params.stop,
        stream: true,
      }),
    });
    if (!response.ok) throw new Error(`Mistral stream error: ${response.status}`);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") { yield { content: "", done: true }; return; }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.content) yield { content: delta.content, done: false };
        } catch { /* skip */ }
      }
    }
    yield { content: "", done: true };
  }

  async embedding(params: EmbeddingParams): Promise<EmbeddingResult> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ model: params.model || "mistral-embed", input: params.input }),
    });
    if (!response.ok) throw new Error(`Mistral Embedding API error: ${response.status}`);
    const data = await response.json();
    return {
      embeddings: data.data?.map((d: { embedding: number[] }) => d.embedding) || [],
      model: data.model || "mistral-embed",
      usage: { promptTokens: data.usage?.prompt_tokens || 0, totalTokens: data.usage?.total_tokens || 0 },
    };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/models`, { headers: this.headers() });
      return { healthy: response.ok, latency: Date.now() - start, error: response.ok ? undefined : `Status ${response.status}` };
    } catch (err) {
      return { healthy: false, latency: Date.now() - start, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }

  estimateCost(model: string, promptTokens: number, completionTokens: number): CostEstimate {
    const price = MISTRAL_PRICING[model] || { input: 1, output: 3 };
    const inputCost = (promptTokens / 1000) * price.input;
    const outputCost = (completionTokens / 1000) * price.output;
    return { inputCost, outputCost, cachedCost: 0, totalCost: inputCost + outputCost, currency: "USD" };
  }

  private headers(): Record<string, string> {
    return { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` };
  }
}
