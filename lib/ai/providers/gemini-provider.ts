import { ProviderInterface, ChatParams, ChatResult, StreamChunk, VisionParams, EmbeddingParams, EmbeddingResult, HealthCheckResult, CostEstimate, ModelCapability } from "../provider-interface";

const GEMINI_PRICING: Record<string, { input: number; output: number }> = {
  "gemini-2.0-pro": { input: 0.5, output: 1.5 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-2.0-flash-lite": { input: 0.075, output: 0.3 },
  "gemini-1.5-pro": { input: 0.5, output: 1.5 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
  "gemini-1.0-pro": { input: 0.5, output: 1.5 },
  "text-embedding-004": { input: 0.1, output: 0 },
};

export class GeminiProvider implements ProviderInterface {
  readonly name = "gemini";
  readonly displayName = "Google Gemini";
  readonly type = "google";
  readonly capabilities: ModelCapability[] = ["chat", "stream", "vision", "embedding", "code", "reasoning"];

  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || process.env.AI_API_KEY || "";
    this.baseUrl = process.env.GOOGLE_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
    this.defaultModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  }

  async chat(params: ChatParams): Promise<ChatResult> {
    const start = Date.now();
    const contents = this.toGeminiMessages(params.messages);
    const response = await fetch(`${this.baseUrl}/models/${params.model || this.defaultModel}:generateContent?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: params.temperature ?? 0.7,
          maxOutputTokens: params.maxTokens,
          topP: params.topP,
          stopSequences: params.stop,
        },
      }),
    });
    if (!response.ok) throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    const candidate = data.candidates?.[0];
    return {
      content: candidate?.content?.parts?.map((p: { text: string }) => p.text).join("") || "",
      model: params.model || this.defaultModel,
      provider: this.name,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
      latency: Date.now() - start,
    };
  }

  async *stream(params: ChatParams): AsyncGenerator<StreamChunk> {
    const contents = this.toGeminiMessages(params.messages);
    const response = await fetch(`${this.baseUrl}/models/${params.model || this.defaultModel}:streamGenerateContent?alt=sse&key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: params.temperature ?? 0.7,
          maxOutputTokens: params.maxTokens,
          topP: params.topP,
          stopSequences: params.stop,
        },
      }),
    });
    if (!response.ok) throw new Error(`Gemini stream error: ${response.status}`);
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
        if (!data || data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const text = parsed.candidates?.[0]?.content?.parts?.map((p: { text: string }) => p.text).join("") || "";
          if (text) yield { content: text, done: false };
        } catch { /* skip parse errors */ }
      }
    }
    yield { content: "", done: true };
  }

  async vision(params: VisionParams): Promise<ChatResult> {
    return this.chat({
      messages: [
        { role: "user", content: [{ type: "text", text: params.prompt }, { type: "image_url", image_url: { url: params.image } }] as any },
      ],
      model: params.model,
      maxTokens: params.maxTokens,
    });
  }

  async embedding(params: EmbeddingParams): Promise<EmbeddingResult> {
    const model = params.model || "text-embedding-004";
    const response = await fetch(`${this.baseUrl}/models/${model}:embedContent?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: typeof params.input === "string" ? params.input : params.input.join("\n") }] },
      }),
    });
    if (!response.ok) throw new Error(`Gemini Embedding API error: ${response.status}`);
    const data = await response.json();
    return {
      embeddings: data.embedding ? [data.embedding.values] : [],
      model,
      usage: { promptTokens: data.usageMetadata?.promptTokenCount || 0, totalTokens: data.usageMetadata?.totalTokenCount || 0 },
    };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`, { headers: { "Content-Type": "application/json" } });
      return { healthy: response.ok, latency: Date.now() - start, error: response.ok ? undefined : `Status ${response.status}` };
    } catch (err) {
      return { healthy: false, latency: Date.now() - start, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }

  estimateCost(model: string, promptTokens: number, completionTokens: number): CostEstimate {
    const price = GEMINI_PRICING[model] || { input: 0.1, output: 0.4 };
    const inputCost = (promptTokens / 1000) * price.input;
    const outputCost = (completionTokens / 1000) * price.output;
    return { inputCost, outputCost, cachedCost: 0, totalCost: inputCost + outputCost, currency: "USD" };
  }

  private toGeminiMessages(messages: Array<{ role: string; content: any }>) {
    const gemini: Array<{ role: string; parts: Array<{ text: string } | any> }> = [];
    for (const msg of messages) {
      const role = msg.role === "assistant" ? "model" : msg.role === "system" ? "user" : msg.role;
      let parts: Array<{ text: string } | any>;
      if (typeof msg.content === "string") {
        parts = [{ text: msg.content }];
      } else if (Array.isArray(msg.content)) {
        parts = msg.content.map((c: any) => {
          if (c.type === "text") return { text: c.text };
          if (c.type === "image_url") return { inlineData: { mimeType: "image/jpeg", data: c.image_url?.url?.replace(/^data:image\/\w+;base64,/, "") || "" } };
          return { text: JSON.stringify(c) };
        });
      } else {
        parts = [{ text: JSON.stringify(msg.content) }];
      }
      gemini.push({ role, parts });
    }
    return gemini;
  }
}
