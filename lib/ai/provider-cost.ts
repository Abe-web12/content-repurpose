import { prisma } from "@/lib/prisma";
import { CostEstimate } from "./provider-interface";

const DEFAULT_COST_PER_INPUT = 0.000003;
const DEFAULT_COST_PER_OUTPUT = 0.000015;
const DEFAULT_COST_PER_CACHED = 0.0000015;

export class AICostTracker {
  static async getModelCost(providerId: string, model: string) {
    const cost = await prisma.aiProviderCosts.findFirst({
      where: {
        providerId,
        model,
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
      },
      orderBy: { effectiveFrom: "desc" },
    });

    if (cost) {
      return {
        input: cost.costPerInput,
        output: cost.costPerOutput,
        cached: cost.costPerCached,
      };
    }

    const provider = await prisma.aiProviders.findUnique({ where: { id: providerId } });
    if (provider) {
      const config = provider.config as Record<string, unknown> | null;
      return {
        input: (config?.costPerInput as number) ?? DEFAULT_COST_PER_INPUT,
        output: (config?.costPerOutput as number) ?? DEFAULT_COST_PER_OUTPUT,
        cached: (config?.costPerCached as number) ?? DEFAULT_COST_PER_CACHED,
      };
    }

    return { input: DEFAULT_COST_PER_INPUT, output: DEFAULT_COST_PER_OUTPUT, cached: DEFAULT_COST_PER_CACHED };
  }

  static async calculateCost(
    providerId: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
    cachedTokens: number = 0
  ): Promise<CostEstimate> {
    const rates = await this.getModelCost(providerId, model);
    const inputCost = (promptTokens - cachedTokens) * rates.input;
    const cachedCost = cachedTokens * rates.cached;
    const outputCost = completionTokens * rates.output;
    const totalCost = inputCost + cachedCost + outputCost;

    return {
      inputCost: Math.round(inputCost * 1e6) / 1e6,
      outputCost: Math.round(outputCost * 1e6) / 1e6,
      cachedCost: Math.round(cachedCost * 1e6) / 1e6,
      totalCost: Math.round(totalCost * 1e6) / 1e6,
      currency: "USD",
    };
  }

  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  static async getCostsByDateRange(options: { startDate: Date; endDate: Date }) {
    return prisma.aiProviderCosts.findMany({
      where: {
        effectiveFrom: { lte: options.endDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: options.startDate } }],
      },
      orderBy: { effectiveFrom: "desc" },
    });
  }

  static formatCost(cost: number): string {
    if (cost < 0.000001) return `${(cost * 1e9).toFixed(2)} nUSD`;
    if (cost < 0.001) return `${(cost * 1e6).toFixed(2)} µUSD`;
    if (cost < 1) return `${(cost * 1000).toFixed(2)} mUSD`;
    return `$${cost.toFixed(4)}`;
  }
}
