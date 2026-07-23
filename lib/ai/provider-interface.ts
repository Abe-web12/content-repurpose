export type ProviderType =
  | "openai" | "anthropic" | "google" | "morphllm"
  | "openrouter" | "mistral" | "groq" | "deepseek" | "azure" | "custom";

export type ModelCapability =
  | "chat" | "stream" | "vision" | "embedding"
  | "audio" | "image" | "code" | "reasoning" | "function_calling";

export interface ChatParams {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
  stream?: boolean;
}

export interface ChatResult {
  content: string;
  model: string;
  provider: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cachedTokens?: number;
  };
  latency: number;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface EmbeddingParams {
  input: string | string[];
  model?: string;
}

export interface EmbeddingResult {
  embeddings: number[][];
  model: string;
  usage: { promptTokens: number; totalTokens: number };
}

export interface VisionParams {
  image: string;
  prompt: string;
  model?: string;
  maxTokens?: number;
}

export interface AudioParams {
  audio: string;
  model?: string;
  language?: string;
}

export interface ImageParams {
  prompt: string;
  model?: string;
  size?: string;
  quality?: string;
}

export interface HealthCheckResult {
  healthy: boolean;
  latency: number;
  error?: string;
  model?: string;
}

export interface CostEstimate {
  inputCost: number;
  outputCost: number;
  cachedCost: number;
  totalCost: number;
  currency: string;
}

export interface ProviderInterface {
  readonly name: string;
  readonly displayName: string;
  readonly type: ProviderType;
  readonly capabilities: ModelCapability[];

  chat(params: ChatParams): Promise<ChatResult>;
  stream?(params: ChatParams): AsyncGenerator<StreamChunk>;
  vision?(params: VisionParams): Promise<ChatResult>;
  embedding?(params: EmbeddingParams): Promise<EmbeddingResult>;
  audio?(params: AudioParams): Promise<ChatResult>;
  image?(params: ImageParams): Promise<ChatResult>;
  healthCheck(): Promise<HealthCheckResult>;
  estimateCost(model: string, promptTokens: number, completionTokens: number): CostEstimate;
}
