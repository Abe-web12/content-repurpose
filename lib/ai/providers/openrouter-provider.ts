import { ProviderInterface, ChatParams, ChatResult, StreamChunk, VisionParams, EmbeddingParams, EmbeddingResult, HealthCheckResult, CostEstimate, ModelCapability } from "../provider-interface";

export class OpenrouterProvider implements ProviderInterface {
  readonly name = "openrouter";
  readonly displayName = "OpenRouter";
  readonly type = "openrouter";
  readonly capabilities: ModelCapability[] = ["chat", "stream", "vision", "embedding", "code", "reasoning", "function_calling"];

  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || "";
    this.baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
    this.defaultModel = process.env.OPENROUTER_MODEL || "openai/gpt-4o";
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
    if (!response.ok) throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
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
    if (!response.ok) throw new Error(`OpenRouter stream error: ${response.status}`);
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

  async vision(params: VisionParams): Promise<ChatResult> {
    const start = Date.now();
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: params.model || this.defaultModel,
        messages: [{ role: "user", content: [{ type: "text", text: params.prompt }, { type: "image_url", image_url: { url: params.image } }] }],
        max_tokens: params.maxTokens ?? 2048,
      }),
    });
    if (!response.ok) throw new Error(`OpenRouter Vision API error: ${response.status}`);
    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || "",
      model: data.model || params.model || this.defaultModel,
      provider: this.name,
      usage: { promptTokens: data.usage?.prompt_tokens || 0, completionTokens: data.usage?.completion_tokens || 0, totalTokens: data.usage?.total_tokens || 0 },
      latency: Date.now() - start,
    };
  }

  async embedding(params: EmbeddingParams): Promise<EmbeddingResult> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ model: params.model || "openai/text-embedding-3-small", input: params.input }),
    });
    if (!response.ok) throw new Error(`OpenRouter Embedding API error: ${response.status}`);
    const data = await response.json();
    return {
      embeddings: data.data?.map((d: { embedding: number[] }) => d.embedding) || [],
      model: data.model || "text-embedding-3-small",
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
    return { inputCost: 0, outputCost: 0, cachedCost: 0, totalCost: 0, currency: "USD" };
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      "HTTP-Referer": process.env.OPENROUTER_REFERRER || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": process.env.NEXT_PUBLIC_APP_NAME || "RepurposeAI",
    };
  }
}
