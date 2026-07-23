import { redis } from "@/lib/redis";

export interface QueueJob {
  id: string;
  workflowId: string;
  userId: string;
  triggerData: Record<string, unknown>;
  priority: number;
  scheduledAt: number | null;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
}

const QUEUE_PREFIX = "exec:queue";
const DEAD_LETTER_PREFIX = "exec:dead-letter";
const WORKER_HEARTBEAT_PREFIX = "exec:worker:heartbeat";
const PROCESSING_PREFIX = "exec:processing";

export class ExecutionQueue {
  static async enqueue(
    job: Omit<QueueJob, "createdAt" | "retryCount">,
  ): Promise<void> {
    const jobData: QueueJob = {
      ...job,
      createdAt: Date.now(),
      retryCount: 0,
    };

    const jobKey = `${QUEUE_PREFIX}:${job.id}`;
    await redis.set(jobKey, JSON.stringify(jobData), { ex: 86400 });

    if (job.scheduledAt && job.scheduledAt > Date.now()) {
      await redis.zadd(`${QUEUE_PREFIX}:scheduled`, {
        score: job.scheduledAt,
        member: job.id,
      });
    } else {
      const score = job.priority * -1;
      await redis.zadd(`${QUEUE_PREFIX}:ready`, {
        score,
        member: job.id,
      });
    }
  }

  static async enqueuePriority(
    job: Omit<QueueJob, "createdAt" | "retryCount" | "priority"> & { priority?: number },
  ): Promise<void> {
    return this.enqueue({ ...job, priority: job.priority ?? 0 });
  }

  static async dequeue(workerId: string): Promise<QueueJob | null> {
    const now = Date.now();

    const scheduledIds = await redis.zrange(
      `${QUEUE_PREFIX}:scheduled`,
      0,
      now,
      { byScore: true },
    );
    if (scheduledIds.length > 0) {
      for (const id of scheduledIds) {
        const moved = await redis.zrem(`${QUEUE_PREFIX}:scheduled`, id);
        if (moved) {
          await redis.zadd(`${QUEUE_PREFIX}:ready`, {
            score: 0,
            member: id,
          });
        }
      }
    }

    const members = await redis.zrange(
      `${QUEUE_PREFIX}:ready`,
      0,
      0,
    );
    if (members.length === 0) return null;

    const jobId = members[0];
    const removed = await redis.zrem(`${QUEUE_PREFIX}:ready`, jobId);
    if (!removed) return null;

    const jobStr = await redis.get(`${QUEUE_PREFIX}:${jobId}`);
    if (!jobStr) return null;

    const job = JSON.parse(jobStr as string) as QueueJob;

    await redis.set(`${PROCESSING_PREFIX}:${jobId}`, workerId, { ex: 300 });
    await this.heartbeat(workerId);

    return job;
  }

  static async complete(jobId: string): Promise<void> {
    await redis.del(`${QUEUE_PREFIX}:${jobId}`);
    await redis.del(`${PROCESSING_PREFIX}:${jobId}`);
  }

  static async fail(jobId: string, error: string): Promise<void> {
    const jobStr = await redis.get(`${QUEUE_PREFIX}:${jobId}`);
    if (!jobStr) return;

    const job = JSON.parse(jobStr as string) as QueueJob;
    job.retryCount++;

    if (job.retryCount <= job.maxRetries) {
      await redis.set(`${QUEUE_PREFIX}:${jobId}`, JSON.stringify(job));
      await redis.zadd(`${QUEUE_PREFIX}:ready`, {
        score: job.priority * -1,
        member: jobId,
      });
    } else {
      await redis.zadd(`${DEAD_LETTER_PREFIX}`, {
        score: Date.now(),
        member: JSON.stringify({ ...job, error }),
      });
      await redis.del(`${QUEUE_PREFIX}:${jobId}`);
    }

    await redis.del(`${PROCESSING_PREFIX}:${jobId}`);
  }

  static async heartbeat(workerId: string): Promise<void> {
    await redis.set(`${WORKER_HEARTBEAT_PREFIX}:${workerId}`, Date.now().toString(), { ex: 30 });
  }

  static async isWorkerAlive(workerId: string): Promise<boolean> {
    const heartbeat = await redis.get<string>(`${WORKER_HEARTBEAT_PREFIX}:${workerId}`);
    if (!heartbeat) return false;
    const age = Date.now() - parseInt(heartbeat as string, 10);
    return age < 60000;
  }

  static async getQueueSize(): Promise<number> {
    return redis.zcard(`${QUEUE_PREFIX}:ready`);
  }

  static async getScheduledCount(): Promise<number> {
    return redis.zcard(`${QUEUE_PREFIX}:scheduled`);
  }

  static async getProcessingCount(): Promise<number> {
    const keys = await redis.keys(`${PROCESSING_PREFIX}:*`);
    return keys.length;
  }

  static async getDeadLetterCount(): Promise<number> {
    return redis.zcard(DEAD_LETTER_PREFIX);
  }

  static async requeueDeadLetters(): Promise<number> {
    const items = await redis.zrange(DEAD_LETTER_PREFIX, 0, -1);
    let requeued = 0;
    for (const item of items) {
      try {
        const job = JSON.parse(item as string) as QueueJob;
        const { retryCount: _rc, createdAt: _ca, ...cleanJob } = job;
        await this.enqueue(cleanJob);
        await redis.zrem(DEAD_LETTER_PREFIX, item);
        requeued++;
      } catch {
        // skip malformed
      }
    }
    return requeued;
  }

  static async clearQueue(): Promise<void> {
    const keys = await redis.keys(`${QUEUE_PREFIX}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
