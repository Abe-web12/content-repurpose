import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import type { AiJobStatus, AiJobStepStatus } from "@prisma/client";
import { AppError } from "@/lib/utils/api-errors";

const JOB_LOCK_TTL = 30;

export interface CreateJobInput {
  userId: string;
  inputContent: string;
  outputFormat: string;
  voiceProfileId?: string | null;
  brandKitId?: string | null;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export interface JobProgress {
  jobId: string;
  status: AiJobStatus;
  progress: number;
  currentStep: string;
  provider: string;
  model: string;
  estimatedEta: number | null;
}

const JOB_STEPS = [
  "validate",
  "moderation",
  "prompt_assembly",
  "generation",
  "post_processing",
  "store",
  "complete",
] as const;

export class AiJobManager {
  static async create(input: CreateJobInput) {
    const job = await prisma.aiJobs.create({
      data: {
        userId: input.userId,
        status: "QUEUED",
        inputContent: input.inputContent,
        outputFormat: input.outputFormat,
        voiceProfileId: input.voiceProfileId ?? null,
        brandKitId: input.brandKitId ?? null,
        priority: input.priority ?? 0,
        progress: 0,
        metadata: (input.metadata ?? {}) as any,
      },
    });

    await this.createSteps(job.id);
    await this.updateStep(job.id, "validate", "RUNNING", "Validating input");

    return job;
  }

  private static async createSteps(jobId: string) {
    await prisma.aiJobSteps.createMany({
      data: JOB_STEPS.map((step, i) => ({
        jobId,
        step,
        status: i === 0 ? "RUNNING" : "PENDING",
        message: i === 0 ? "Validating input" : `Waiting for ${step}`,
      })),
    });
  }

  static async updateStep(
    jobId: string,
    step: string,
    status: AiJobStepStatus,
    message?: string,
  ) {
    const data: Record<string, unknown> = { status };
    if (message) data.message = message;
    if (status === "RUNNING") data.startedAt = new Date();
    if (status === "COMPLETED" || status === "FAILED") {
      data.completedAt = new Date();
      const stepRecord = await prisma.aiJobSteps.findFirst({
        where: { jobId, step },
      });
      if (stepRecord?.startedAt) {
        data.duration = Math.round(
          (Date.now() - stepRecord.startedAt.getTime()) / 1000,
        );
      }
    }

    return prisma.aiJobSteps.updateMany({
      where: { jobId, step },
      data: data as any,
    });
  }

  static async updateStatus(
    jobId: string,
    status: AiJobStatus,
    extra?: Record<string, unknown>,
  ) {
    const data: Record<string, unknown> = { status };
    if (status === "RUNNING") data.startedAt = new Date();
    if (status === "COMPLETED") {
      data.completedAt = new Date();
      data.progress = 100;
    }
    if (status === "CANCELLED") data.cancelledAt = new Date();
    if (extra) Object.assign(data, extra);

    return prisma.aiJobs.update({ where: { id: jobId }, data: data as any });
  }

  static async updateProgress(jobId: string, progress: number) {
    return prisma.aiJobs.update({
      where: { id: jobId },
      data: { progress: Math.min(progress, 100) },
    });
  }

  static async getJob(jobId: string, userId: string) {
    const job = await prisma.aiJobs.findUnique({
      where: { id: jobId },
      include: { steps: { orderBy: { createdAt: "asc" } } },
    });
    if (!job) throw new AppError("Job not found", 404);
    if (job.userId !== userId) throw new AppError("Forbidden", 403);
    return job;
  }

  static async listJobs(
    userId: string,
    options?: {
      status?: string;
      limit?: number;
      cursor?: string;
    },
  ) {
    const where: Record<string, unknown> = { userId };
    if (options?.status) where.status = options.status;

    const limit = Math.min(options?.limit ?? 20, 100);
    const jobs = await prisma.aiJobs.findMany({
      where: where as any,
      take: limit + 1,
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        provider: true,
        model: true,
        outputFormat: true,
        progress: true,
        estimatedCost: true,
        duration: true,
        error: true,
        retryCount: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
      },
    });

    const hasMore = jobs.length > limit;
    const data = hasMore ? jobs.slice(0, limit) : jobs;
    return {
      data,
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }

  static async cancelJob(jobId: string, userId: string) {
    const job = await prisma.aiJobs.findUnique({ where: { id: jobId } });
    if (!job) throw new AppError("Job not found", 404);
    if (job.userId !== userId) throw new AppError("Forbidden", 403);
    if (job.status === "COMPLETED") throw new AppError("Cannot cancel a completed job", 400);
    if (job.status === "CANCELLED") throw new AppError("Job is already cancelled", 400);

    const cancelKey = `ai:job:cancel:${jobId}`;
    await redis.set(cancelKey, "1", { ex: JOB_LOCK_TTL });

    await prisma.aiJobs.update({
      where: { id: jobId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });

    return { id: jobId, status: "CANCELLED" };
  }

  static async getProgress(jobId: string, userId: string): Promise<JobProgress | null> {
    const job = await prisma.aiJobs.findUnique({
      where: { id: jobId },
      include: { steps: { orderBy: { createdAt: "asc" } } },
    });
    if (!job || job.userId !== userId) return null;

    const currentStep = job.steps.find((s) => s.status === "RUNNING")?.step ?? "complete";

    return {
      jobId: job.id,
      status: job.status as AiJobStatus,
      progress: job.progress,
      currentStep,
      provider: job.provider,
      model: job.model,
      estimatedEta: job.status === "RUNNING" ? 30000 : null,
    };
  }

  static async shouldCancel(jobId: string): Promise<boolean> {
    const cancelled = await redis.get(`ai:job:cancel:${jobId}`);
    return cancelled === "1";
  }

  static async setResult(
    jobId: string,
    result: {
      outputContent: string;
      provider: string;
      model: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCost: number;
      duration: number;
    },
  ) {
    const now = new Date();

    await prisma.aiJobs.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        outputContent: result.outputContent,
        provider: result.provider,
        model: result.model,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.totalTokens,
        estimatedCost: result.estimatedCost,
        duration: result.duration,
        progress: 100,
        completedAt: now,
      },
    });

    await this.updateStep(jobId, "complete", "COMPLETED", "Generation completed");
  }

  static async setError(jobId: string, error: string) {
    await prisma.aiJobs.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        error,
        completedAt: new Date(),
      },
    });
  }

  static async incrementRetry(jobId: string) {
    return prisma.aiJobs.update({
      where: { id: jobId },
      data: { retryCount: { increment: 1 } },
    });
  }

  static async getStats(userId: string, days = 7) {
    const since = new Date(Date.now() - days * 86400000);

    const [totalJobs, completedJobs, failedJobs, totalCost, totalTokens] =
      await Promise.all([
        prisma.aiJobs.count({ where: { userId, createdAt: { gte: since } } }),
        prisma.aiJobs.count({
          where: { userId, status: "COMPLETED", createdAt: { gte: since } },
        }),
        prisma.aiJobs.count({
          where: { userId, status: "FAILED", createdAt: { gte: since } },
        }),
        prisma.aiJobs.aggregate({
          where: { userId, createdAt: { gte: since } },
          _sum: { estimatedCost: true },
        }),
        prisma.aiJobs.aggregate({
          where: { userId, createdAt: { gte: since } },
          _sum: { totalTokens: true },
        }),
      ]);

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      totalCost: totalCost._sum.estimatedCost ?? 0,
      totalTokens: totalTokens._sum.totalTokens ?? 0,
      successRate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0,
    };
  }
}
