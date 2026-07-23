import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { AgentRunner } from "./runner";

export interface BackgroundJob {
  id: string;
  agentId: string;
  input: Record<string, unknown>;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  progressMessage: string;
  result?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

const QUEUE_KEY = "agent:background:queue";
const JOB_PREFIX = "agent:background:job:";
const PROGRESS_PREFIX = "agent:background:progress:";

export class BackgroundExecutor {
  static async enqueue(agentId: string, input: Record<string, unknown>): Promise<BackgroundJob> {
    const job: BackgroundJob = {
      id: crypto.randomUUID(),
      agentId,
      input,
      status: "queued",
      progress: 0,
      progressMessage: "Queued",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await redis.set(`${JOB_PREFIX}${job.id}`, JSON.stringify(job));
    await redis.lpush(QUEUE_KEY, job.id);

    return job;
  }

  static async getJob(jobId: string): Promise<BackgroundJob | null> {
    const data = await redis.get(`${JOB_PREFIX}${jobId}`);
    if (!data) return null;
    return JSON.parse(data as string);
  }

  static async updateProgress(jobId: string, progress: number, message: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;
    job.progress = progress;
    job.progressMessage = message;
    job.updatedAt = new Date().toISOString();
    await redis.set(`${JOB_PREFIX}${jobId}`, JSON.stringify(job));
    await redis.set(`${PROGRESS_PREFIX}${jobId}`, JSON.stringify({ progress, message, updatedAt: job.updatedAt }));
    await redis.expire(`${PROGRESS_PREFIX}${jobId}`, 86400);
  }

  static async cancel(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job || job.status === "completed") return;
    job.status = "cancelled";
    job.updatedAt = new Date().toISOString();
    await redis.set(`${JOB_PREFIX}${jobId}`, JSON.stringify(job));
  }

  static async processQueue(): Promise<void> {
    const jobId = await redis.rpop(QUEUE_KEY);
    if (!jobId) return;

    const job = await this.getJob(jobId);
    if (!job || job.status !== "queued") return;

    job.status = "running";
    job.updatedAt = new Date().toISOString();
    await redis.set(`${JOB_PREFIX}${jobId}`, JSON.stringify(job));

    try {
      const agent = await prisma.aiAgents.findUnique({ where: { id: job.agentId } });
      if (!agent) throw new Error("Agent not found for background job");
      const runner = new AgentRunner(agent, {});
      await this.updateProgress(jobId, 10, "Initializing agent...");

      const result = await runner.execute(job.input);
      await this.updateProgress(jobId, 100, "Completed");

      job.status = "completed";
      job.result = result.output || "";
      job.progress = 100;
      job.updatedAt = new Date().toISOString();
      await redis.set(`${JOB_PREFIX}${jobId}`, JSON.stringify(job));

      await prisma.aiAgentRuns.update({
        where: { id: result.runId },
        data: { status: "COMPLETED" },
      });
    } catch (err: any) {
      job.status = "failed";
      job.error = err.message;
      job.updatedAt = new Date().toISOString();
      await redis.set(`${JOB_PREFIX}${jobId}`, JSON.stringify(job));

      if (job.agentId) {
        const run = await prisma.aiAgentRuns.findFirst({
          where: { agentId: job.agentId },
          orderBy: { createdAt: "desc" },
        });
        if (run) {
          await prisma.aiAgentRuns.update({
            where: { id: run.id },
            data: { status: "FAILED", error: err.message },
          });
        }
      }
    }
  }

  static async listJobs(agentId?: string): Promise<BackgroundJob[]> {
    const keys = await redis.keys(`${JOB_PREFIX}*`);
    const jobs: BackgroundJob[] = [];
    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const job = JSON.parse(data as string);
        if (!agentId || job.agentId === agentId) {
          jobs.push(job);
        }
      }
    }
    return jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}
