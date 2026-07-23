import { redis } from "@/lib/redis";
import { WorkflowEngine } from "./engine";

const WORKFLOW_QUEUE_KEY = "workflow:queue";
const WORKFLOW_PROCESSING_KEY = "workflow:processing";

interface QueueItem {
  workflowId: string;
  organizationId: string;
  userId: string;
  triggerType: string;
  triggerData?: Record<string, unknown>;
  queuedAt: string;
}

export class WorkflowQueue {
  static async enqueue(item: Omit<QueueItem, "queuedAt">) {
    const queueItem: QueueItem = { ...item, queuedAt: new Date().toISOString() };
    await redis.rpush(WORKFLOW_QUEUE_KEY, JSON.stringify(queueItem));
    return queueItem;
  }

  static async dequeue(): Promise<QueueItem | null> {
    const item = await redis.lpop(WORKFLOW_QUEUE_KEY);
    if (!item) return null;
    try {
      return JSON.parse(item as string) as QueueItem;
    } catch {
      return null;
    }
  }

  static async processNext(): Promise<boolean> {
    const item = await this.dequeue();
    if (!item) return false;

    const processingKey = `${WORKFLOW_PROCESSING_KEY}:${item.workflowId}`;
    const locked = await redis.setnx(processingKey, "1");
    if (locked === 0) {
      await this.enqueue(item);
      return false;
    }

    await redis.expire(processingKey, 300);

    try {
      await WorkflowEngine.execute(item.workflowId, {
        organizationId: item.organizationId,
        userId: item.userId,
        triggerType: item.triggerType,
        triggerData: item.triggerData,
      });
      return true;
    } finally {
      await redis.del(processingKey);
    }
  }

  static async processAll(): Promise<number> {
    let count = 0;
    while (await this.processNext()) {
      count++;
    }
    return count;
  }

  static async getQueueLength(): Promise<number> {
    return redis.llen(WORKFLOW_QUEUE_KEY);
  }

  static async isProcessing(workflowId: string): Promise<boolean> {
    const exists = await redis.exists(`${WORKFLOW_PROCESSING_KEY}:${workflowId}`);
    return exists === 1;
  }

  static async clear() {
    await redis.del(WORKFLOW_QUEUE_KEY);
  }
}
