import { prisma } from "../prisma";
import { redis } from "@/lib/redis";
import type { ProviderName } from "../ai/orchestrator";

export interface ExperimentVariant {
  name: string;
  description?: string;
  provider?: ProviderName;
  config?: Record<string, unknown>;
  traffic?: number;
}

export interface ExperimentDefinition {
  id: string;
  name: string;
  description?: string;
  type: string;
  enabled: boolean;
  variants: ExperimentVariant[];
  winner?: string;
  createdById: string;
  startedAt?: Date;
  endedAt?: Date;
}

const ACTIVE_EXPERIMENT_KEY = "experiments:active";

export class ExperimentFramework {
  static async createExperiment(data: {
    name: string;
    description?: string;
    type: string;
    variants: ExperimentVariant[];
    createdById: string;
  }): Promise<{ id: string }> {
    const experiment = await prisma.experiments.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        type: data.type,
        variants: data.variants as any,
        createdById: data.createdById,
      },
    });
    return { id: experiment.id };
  }

  static async getExperiment(id: string): Promise<ExperimentDefinition | null> {
    const exp = await prisma.experiments.findUnique({ where: { id } });
    if (!exp) return null;
    return this.mapExperiment(exp);
  }

  static async listExperiments(): Promise<ExperimentDefinition[]> {
    const exps = await prisma.experiments.findMany({
      orderBy: { createdAt: "desc" },
    });
    return exps.map((e) => this.mapExperiment(e));
  }

  static async startExperiment(id: string): Promise<void> {
    await prisma.experiments.update({
      where: { id },
      data: { enabled: true, startedAt: new Date() },
    });
  }

  static async stopExperiment(id: string): Promise<void> {
    await prisma.experiments.update({
      where: { id },
      data: { enabled: false, endedAt: new Date() },
    });
    await redis.srem(ACTIVE_EXPERIMENT_KEY, id);
  }

  static async assignVariant(
    experimentId: string,
    userContext: { userId: string },
  ): Promise<ExperimentVariant | null> {
    const exp = await this.getExperiment(experimentId);
    if (!exp || !exp.enabled || exp.variants.length === 0) return null;

    const assignmentKey = `experiment:${experimentId}:assign:${userContext.userId}`;
    const cached = await redis.get<string>(assignmentKey);
    if (cached) {
      return exp.variants.find((v) => v.name === cached) ?? null;
    }

    const totalTraffic = exp.variants.reduce((s, v) => s + (v.traffic ?? 1), 0);
    let random = Math.random() * totalTraffic;
    let selected: ExperimentVariant | null = null;

    for (const variant of exp.variants) {
      random -= variant.traffic ?? 1;
      if (random <= 0) {
        selected = variant;
        break;
      }
    }

    if (!selected) selected = exp.variants[0];

    await redis.set(assignmentKey, selected.name, { ex: 86400 });

    return selected;
  }

  static async recordMetric(
    experimentId: string,
    variantName: string,
    metric: { name: string; value: number },
  ): Promise<void> {
    const key = `experiment:${experimentId}:metrics`;
    const current = await redis.hgetall<Record<string, string>>(key);
    const variantKey = `${variantName}:${metric.name}`;

    const existing = current?.[variantKey]
      ? JSON.parse(current[variantKey])
      : { count: 0, total: 0 };

    existing.count++;
    existing.total += metric.value;
    existing.avg = existing.total / existing.count;

    await redis.hset(key, { [variantKey]: JSON.stringify(existing) });
  }

  static async getResults(experimentId: string): Promise<{
    experiment: ExperimentDefinition;
    metrics: Record<string, Array<{ name: string; count: number; avg: number; total: number }>>;
  }> {
    const exp = await this.getExperiment(experimentId);
    if (!exp) throw new Error("Experiment not found");

    const key = `experiment:${experimentId}:metrics`;
    const raw = await redis.hgetall<Record<string, string>>(key);
    const metrics: Record<string, Array<{ name: string; count: number; avg: number; total: number }>> = {};

    if (raw) {
      for (const [compositeKey, value] of Object.entries(raw)) {
        const [variantName, metricName] = compositeKey.split(":");
        if (!metrics[variantName]) metrics[variantName] = [];
        metrics[variantName].push({
          name: metricName,
          ...JSON.parse(value),
        });
      }
    }

    return { experiment: exp, metrics };
  }

  static async declareWinner(experimentId: string, variantName: string): Promise<void> {
    await prisma.experiments.update({
      where: { id: experimentId },
      data: { winner: variantName },
    });
  }

  private static mapExperiment(exp: Record<string, unknown>): ExperimentDefinition {
    return {
      id: exp.id as string,
      name: exp.name as string,
      description: exp.description as string | undefined,
      type: exp.type as string,
      enabled: exp.enabled as boolean,
      variants: (exp.variants as ExperimentVariant[]) ?? [],
      winner: exp.winner as string | undefined,
      createdById: exp.createdById as string,
      startedAt: exp.startedAt as Date | undefined,
      endedAt: exp.endedAt as Date | undefined,
    };
  }
}
