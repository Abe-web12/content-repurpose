import { ProviderInterface, ChatParams, ChatResult, StreamChunk, VisionParams, HealthCheckResult, CostEstimate, ModelCapability } from "../provider-interface";

const GROQ_PRICING: Record<string, { input: number; output: number }> = {
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
  "llama-3.2-90b-vision": { input: 0.59, output: 0.79 },
  "llama-3.2-11b-vision": { input: 0.05, output: 0.08 },
  "llama-3.2-3b": { input: 0.02, output: 0.05 },
  "llama-3.2-1b": { input: 0.01, output: 0.02 },
  "mixtral-8x7b-32768": { input: 0.24, output: 0.24 },
  "gemma2-9b-it": { input: 0.08, output: 0.08 },
  "deepseek-r1-distill-llama-70b": { input: 0.59, output: 0.79 },
  "qwen-2.5-32b": { input: 0.59, output: 0.79 },
  "qwen-2.5-coder-32b": { input: 0.59, output: 0.79 },
};

export class GroqProvider implements ProviderInterface {
  readonly name = "groq";
  readonly displayName = "Groq";
  readonly type = "groq";
  readonly capabilities: ModelCapability[] = ["chat", "stream", "vision", "code"];

  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || "";
    this.baseUrl = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
    this.defaultModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
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
    if (!response.ok) throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
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
    if (!response.ok) throw new Error(`Groq stream error: ${response.status}`);
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
    if (!response.ok) throw new Error(`Groq Vision API error: ${response.status}`);
    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || "",
      model: data.model || params.model || this.defaultModel,
      provider: this.name,
      usage: { promptTokens: data.usage?.prompt_tokens || 0, completionTokens: data.usage?.completion_tokens || 0, totalTokens: data.usage?.total_tokens || 0 },
      latency: Date.now() - start,
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
    const price = GROQ_PRICING[model] || { input: 0.59, output: 0.79 };
    const inputCost = (promptTokens / 1000) * price.input;
    const outputCost = (completionTokens / 1000) * price.output;
    return { inputCost, outputCost, cachedCost: 0, totalCost: inputCost + outputCost, currency: "USD" };
  }

  private headers(): Record<string, string> {
    return { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` };
  }
}
