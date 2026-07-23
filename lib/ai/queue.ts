import { redis } from "@/lib/redis";
import { AiJobManager } from "./job";

const QUEUE_KEY = "ai:queue";
const QUEUE_PROCESSING_KEY = "ai:queue:processing";
const QUEUE_RETRY_KEY = "ai:queue:retry";
const QUEUE_DELAYED_KEY = "ai:queue:delayed";
const WORKER_HEARTBEAT_KEY = "ai:worker:heartbeat";
const DEAD_LETTER_KEY = "ai:dead-letter";

export interface QueueItem {
  jobId: string;
  userId: string;
  priority: number;
  enqueuedAt: number;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: number | null;
}

const RETRY_DELAYS = [1000, 3000, 10000, 30000];

export class AiQueue {
  static async enqueue(jobId: string, userId: string, priority = 0): Promise<void> {
    const item: QueueItem = {
      jobId,
      userId,
      priority,
      enqueuedAt: Date.now(),
      retryCount: 0,
      maxRetries: 4,
      nextRetryAt: null,
    };

    const score = priority * -1;
    await redis.zadd(QUEUE_KEY, { score, member: JSON.stringify(item) });
  }

  static async enqueueDelayed(jobId: string, userId: string, delayMs: number): Promise<void> {
    const item: QueueItem = {
      jobId,
      userId,
      priority: 0,
      enqueuedAt: Date.now(),
      retryCount: 0,
      maxRetries: 4,
      nextRetryAt: Date.now() + delayMs,
    };

    await redis.zadd(QUEUE_DELAYED_KEY, {
      score: Date.now() + delayMs,
      member: JSON.stringify(item),
    });
  }

  static async dequeue(workerId: string): Promise<QueueItem | null> {
    await this.moveDelayedToReady();

    const members = await redis.zrange(QUEUE_KEY, 0, 0);
    if (members.length === 0) return null;

    const raw = members[0] as string;
    const removed = await redis.zrem(QUEUE_KEY, raw);
    if (!removed) return null;

    const item = JSON.parse(raw) as QueueItem;

    await redis.hset(QUEUE_PROCESSING_KEY, { [item.jobId]: workerId });
    await redis.expire(QUEUE_PROCESSING_KEY, 300);
    await this.heartbeat(workerId);

    return item;
  }

  static async complete(jobId: string): Promise<void> {
    await redis.hdel(QUEUE_PROCESSING_KEY, jobId);
    await redis.zrem(QUEUE_RETRY_KEY, jobId);
    await redis.del(`ai:queue:retry:${jobId}`);
  }

  static async fail(jobId: string, error: string, retryable = true): Promise<void> {
    const raw = await redis.hget(QUEUE_PROCESSING_KEY, jobId);
    if (!raw) return;

    const itemRaw = await redis.get<string>(`ai:queue:item:${jobId}`);
    if (!itemRaw) {
      await redis.hdel(QUEUE_PROCESSING_KEY, jobId);
      return;
    }

    const item = JSON.parse(itemRaw as string) as QueueItem;
    item.retryCount++;

    if (retryable && item.retryCount <= item.maxRetries) {
      const delay = RETRY_DELAYS[Math.min(item.retryCount - 1, RETRY_DELAYS.length - 1)];
      item.nextRetryAt = Date.now() + delay;

      await redis.set(`ai:queue:item:${jobId}`, JSON.stringify(item));
      await redis.zadd(QUEUE_RETRY_KEY, {
        score: item.nextRetryAt,
        member: jobId,
      });

      await AiJobManager.updateStatus(jobId, "RETRYING", {
        retryCount: item.retryCount,
        error,
        progress: 0,
      } as any);
    } else {
      await redis.zadd(DEAD_LETTER_KEY, {
        score: Date.now(),
        member: JSON.stringify({ ...item, error }),
      });
      await AiJobManager.setError(jobId, error);
    }

    await redis.hdel(QUEUE_PROCESSING_KEY, jobId);
  }

  static async retryDeadLetters(): Promise<number> {
    const items = await redis.zrange(DEAD_LETTER_KEY, 0, -1);
    let count = 0;
    for (const raw of items) {
      try {
        const item = JSON.parse(raw as string);
        item.retryCount = 0;
        await redis.zadd(QUEUE_KEY, { score: 0, member: JSON.stringify(item) });
        await redis.zrem(DEAD_LETTER_KEY, raw);
        count++;
      } catch {
        continue;
      }
    }
    return count;
  }

  static async retryJob(jobId: string, userId: string): Promise<void> {
    const job = await AiJobManager.getJob(jobId, userId);
    if (job.status !== "FAILED") throw new Error("Only failed jobs can be retried");

    await AiJobManager.updateStatus(jobId, "QUEUED", { progress: 0, error: null } as any);
    await this.enqueue(jobId, userId);
  }

  static async cancel(jobId: string): Promise<void> {
    await redis.zrem(QUEUE_KEY, jobId);
    await redis.zrem(QUEUE_RETRY_KEY, jobId);
    await redis.zrem(QUEUE_DELAYED_KEY, jobId);
    await redis.hdel(QUEUE_PROCESSING_KEY, jobId);
  }

  static async heartbeat(workerId: string): Promise<void> {
    await redis.set(`${WORKER_HEARTBEAT_KEY}:${workerId}`, Date.now().toString(), { ex: 30 });
  }

  static async isWorkerAlive(workerId: string): Promise<boolean> {
    const hb = await redis.get(`${WORKER_HEARTBEAT_KEY}:${workerId}`);
    if (!hb) return false;
    return Date.now() - parseInt(hb as string, 10) < 60000;
  }

  static async getQueueLength(): Promise<number> {
    return redis.zcard(QUEUE_KEY);
  }

  static async getProcessingCount(): Promise<number> {
    const keys = await redis.hkeys(QUEUE_PROCESSING_KEY);
    return keys.length;
  }

  static async getRetryCount(): Promise<number> {
    return redis.zcard(QUEUE_RETRY_KEY);
  }

  static async getDeadLetterCount(): Promise<number> {
    return redis.zcard(DEAD_LETTER_KEY);
  }

  private static async moveDelayedToReady(): Promise<void> {
    const now = Date.now();
    const delayed = await redis.zrange(QUEUE_DELAYED_KEY, 0, now, { byScore: true });
    for (const raw of delayed) {
      const moved = await redis.zrem(QUEUE_DELAYED_KEY, raw);
      if (moved) {
        const item = JSON.parse(raw as string) as QueueItem;
        item.nextRetryAt = null;
        await redis.zadd(QUEUE_KEY, { score: item.priority * -1, member: JSON.stringify(item) });
      }
    }
  }

  static async getQueueStats(): Promise<{
    queueLength: number;
    processing: number;
    retryCount: number;
    deadLetterCount: number;
  }> {
    const [queueLength, processing, retryCount, deadLetterCount] = await Promise.all([
      this.getQueueLength(),
      this.getProcessingCount(),
      this.getRetryCount(),
      this.getDeadLetterCount(),
    ]);
    return { queueLength, processing, retryCount, deadLetterCount };
  }

  static async clearQueue(): Promise<void> {
    const keys = await redis.keys("ai:queue*");
    if (keys.length > 0) await redis.del(...keys);
  }
}
