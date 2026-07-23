import { ProviderInterface, ChatParams, ChatResult, StreamChunk, VisionParams, HealthCheckResult, CostEstimate, ModelCapability } from "../provider-interface";

const ANTHROPIC_PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4": { input: 15, output: 75 },
  "claude-opus-4-20250514": { input: 15, output: 75 },
  "claude-sonnet-4": { input: 3, output: 15 },
  "claude-sonnet-4-20250514": { input: 3, output: 15 },
  "claude-3-opus": { input: 15, output: 75 },
  "claude-3-sonnet": { input: 3, output: 15 },
  "claude-3-haiku": { input: 0.25, output: 1.25 },
  "claude-3.5-haiku": { input: 0.25, output: 1.25 },
  "claude-3.5-sonnet": { input: 3, output: 15 },
};

export class AnthropicProvider implements ProviderInterface {
  readonly name = "anthropic";
  readonly displayName = "Anthropic";
  readonly type = "anthropic";
  readonly capabilities: ModelCapability[] = ["chat", "stream", "vision", "code", "reasoning", "function_calling"];

  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || "";
    this.baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com/v1";
    this.defaultModel = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
  }

  async chat(params: ChatParams): Promise<ChatResult> {
    const start = Date.now();
    const system = params.messages.filter(m => m.role === "system").map(m => m.content).join("\n");
    const messages = params.messages.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content }));
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: params.model || this.defaultModel,
        messages,
        system: system || undefined,
        max_tokens: params.maxTokens ?? 2048,
        temperature: params.temperature ?? 0.7,
        top_p: params.topP,
        stop_sequences: params.stop,
      }),
    });
    if (!response.ok) throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    return {
      content: data.content?.[0]?.text || "",
      model: data.model || params.model || this.defaultModel,
      provider: this.name,
      usage: { promptTokens: data.usage?.input_tokens || 0, completionTokens: data.usage?.output_tokens || 0, totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) },
      latency: Date.now() - start,
    };
  }

  async *stream(params: ChatParams): AsyncGenerator<StreamChunk> {
    const system = params.messages.filter(m => m.role === "system").map(m => m.content).join("\n");
    const messages = params.messages.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content }));
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: { ...this.headers(), "Accept": "text/event-stream" },
      body: JSON.stringify({
        model: params.model || this.defaultModel,
        messages,
        system: system || undefined,
        max_tokens: params.maxTokens ?? 2048,
        temperature: params.temperature ?? 0.7,
        top_p: params.topP,
        stop_sequences: params.stop,
        stream: true,
      }),
    });
    if (!response.ok) throw new Error(`Anthropic stream error: ${response.status}`);
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
        if (!data) continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            yield { content: parsed.delta.text, done: false };
          }
          if (parsed.type === "message_stop") {
            yield { content: "", done: true };
            return;
          }
        } catch { /* skip parse errors */ }
      }
    }
    yield { content: "", done: true };
  }

  async vision(params: VisionParams): Promise<ChatResult> {
    return this.chat({
      messages: [
        { role: "user", content: [
          { type: "image", source: { type: "base64", media_type: params.image.startsWith("data:image/png") ? "image/png" : "image/jpeg", data: params.image.replace(/^data:image\/(png|jpeg);base64,/, "") } },
          { type: "text", text: params.prompt },
        ] as any },
      ],
      model: params.model,
      maxTokens: params.maxTokens,
    });
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
    const price = ANTHROPIC_PRICING[model] || { input: 3, output: 15 };
    const inputCost = (promptTokens / 1000) * price.input;
    const outputCost = (completionTokens / 1000) * price.output;
    return { inputCost, outputCost, cachedCost: 0, totalCost: inputCost + outputCost, currency: "USD" };
  }

  private headers(): Record<string, string> {
    return { "Content-Type": "application/json", "x-api-key": this.apiKey, "anthropic-version": "2023-06-01" };
  }
}
