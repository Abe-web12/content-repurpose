export interface CostEstimate {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  provider: string;
  model: string;
}

const RATES: Record<string, { input: number; output: number }> = {
  morphllm: { input: 0.000002, output: 0.000008 },
  gemini: { input: 0.000001, output: 0.000004 },
  default: { input: 0.000003, output: 0.000015 },
};

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateCost(
  prompt: string,
  completion: string,
  provider = "morphllm",
  model?: string,
): CostEstimate {
  const promptTokens = estimateTokens(prompt);
  const completionTokens = estimateTokens(completion);
  const totalTokens = promptTokens + completionTokens;

  const rates = RATES[provider] || RATES.default;
  const estimatedCost =
    promptTokens * rates.input + completionTokens * rates.output;

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCost: Math.round(estimatedCost * 1000000) / 1000000,
    provider,
    model: model || provider,
  };
}

export function calculateActualCost(
  promptTokens: number,
  completionTokens: number,
  provider = "morphllm",
): number {
  const rates = RATES[provider] || RATES.default;
  return Math.round(
    (promptTokens * rates.input + completionTokens * rates.output) * 1000000,
  ) / 1000000;
}

export function formatCost(cost: number): string {
  if (cost < 0.001) return `${(cost * 1000000).toFixed(2)}μ$`;
  if (cost < 1) return `${(cost * 1000).toFixed(2)}m$`;
  return `$${cost.toFixed(4)}`;
}

export class CostTracker {
  static track(prompt: string, completion: string, provider = "morphllm") {
    return estimateCost(prompt, completion, provider);
  }

  static async recordUsage(
    userId: string,
    cost: CostEstimate,
  ): Promise<void> {
    const { prisma } = await import("@/lib/prisma");
    await prisma.usageLog.create({
      data: {
        userId,
        action: "ai_generation",
        creditsConsumed: Math.max(1, Math.ceil(cost.totalTokens / 1000)),
      },
    });
  }
}
