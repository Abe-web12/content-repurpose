import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { ExecutionEngine } from "./engine";
import { ExecutionQueue } from "./queue";

const SCHEDULER_LOCK_KEY = "exec:scheduler:lock";
const SCHEDULER_LOCK_TTL = 30;

export interface ScheduleConfig {
  workflowId: string;
  cronExpression?: string;
  scheduledAt?: Date;
  triggerData?: Record<string, unknown>;
  userId: string;
}

export class ExecutionScheduler {
  static async scheduleWorkflow(config: ScheduleConfig): Promise<void> {
    if (config.cronExpression) {
      await this.storeCronSchedule(config);
    } else if (config.scheduledAt) {
      await this.scheduleOnce(config);
    }
  }

  private static async storeCronSchedule(config: ScheduleConfig): Promise<void> {
    const scheduleKey = `exec:cron:${config.workflowId}`;
    await redis.set(
      scheduleKey,
      JSON.stringify({
        workflowId: config.workflowId,
        cronExpression: config.cronExpression,
        userId: config.userId,
        triggerData: config.triggerData ?? {},
      }),
    );
  }

  private static async scheduleOnce(config: ScheduleConfig): Promise<void> {
    const scheduledAt = config.scheduledAt!.getTime();
    if (scheduledAt <= Date.now()) {
      await ExecutionQueue.enqueue({
        id: `scheduled-${config.workflowId}-${Date.now()}`,
        workflowId: config.workflowId,
        userId: config.userId,
        triggerData: config.triggerData ?? {},
        priority: 0,
        scheduledAt,
        maxRetries: 3,
      });
    }
  }

  static async processScheduledExecution(
    workflowId: string,
    userId: string,
    triggerData?: Record<string, unknown>,
  ): Promise<void> {
    await ExecutionEngine.run(workflowId, userId, triggerData);
  }

  static async checkAndExecuteDueSchedules(): Promise<number> {
    const locked = await redis.set(SCHEDULER_LOCK_KEY, "1", {
      nx: true,
      ex: SCHEDULER_LOCK_TTL,
    });
    if (locked !== "OK") return 0;

    try {
      let executed = 0;
      const cronKeys = await redis.keys("exec:cron:*");
      for (const key of cronKeys) {
        try {
          const configStr = await redis.get(key);
          if (!configStr) continue;

          const config = JSON.parse(configStr as string);
          const lastRunKey = `exec:cron:last:${config.workflowId}`;
          const lastRun = await redis.get<string>(lastRunKey);
          const now = Date.now();

          const shouldRun = this.matchesCron(
            config.cronExpression,
            lastRun ? parseInt(lastRun as string, 10) : 0,
            now,
          );

          if (shouldRun) {
            await ExecutionQueue.enqueue({
              id: `cron-${config.workflowId}-${now}`,
              workflowId: config.workflowId,
              userId: config.userId,
              triggerData: config.triggerData ?? {},
              priority: 0,
              scheduledAt: null,
              maxRetries: 3,
            });
            await redis.set(lastRunKey, now.toString());
            executed++;
          }
        } catch {
          continue;
        }
      }

      return executed;
    } finally {
      await redis.del(SCHEDULER_LOCK_KEY);
    }
  }

  private static matchesCron(
    expression: string,
    lastRun: number,
    now: number,
  ): boolean {
    const parts = expression.split(/\s+/);
    if (parts.length < 5) return false;

    const lastDate = new Date(lastRun || 0);
    const nowDate = new Date(now);

    if (expression.includes("* * * * *")) {
      return now - lastRun >= 60000;
    }

    const everyNMatch = expression.match(/^\*\/(\d+)/);
    if (everyNMatch) {
      const interval = parseInt(everyNMatch[1], 10);
      const lastMinutes = Math.floor(lastDate.getTime() / 60000);
      const nowMinutes = Math.floor(nowDate.getTime() / 60000);
      return nowMinutes - lastMinutes >= interval;
    }

    const minutePart = parts[0];
    const hourPart = parts[1];
    const dayPart = parts[2];
    const monthPart = parts[3];
    const weekPart = parts[4];

    if (monthPart !== "*") {
      const months = this.parseCronPart(monthPart);
      if (!months.includes(nowDate.getMonth() + 1)) return false;
    }
    if (weekPart !== "*") {
      const days = this.parseCronPart(weekPart);
      if (!days.includes(nowDate.getDay())) return false;
    }
    if (dayPart !== "*") {
      const days = this.parseCronPart(dayPart);
      if (!days.includes(nowDate.getDate())) return false;
    }
    if (hourPart !== "*") {
      const hours = this.parseCronPart(hourPart);
      if (!hours.includes(nowDate.getHours())) return false;
    }
    if (minutePart !== "*") {
      const minutes = this.parseCronPart(minutePart);
      if (!minutes.includes(nowDate.getMinutes())) return false;
    }

    return true;
  }

  private static parseCronPart(part: string): number[] {
    if (part === "*") return [];
    if (part.includes(",")) {
      return part.split(",").map(Number);
    }
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      const result: number[] = [];
      for (let i = start; i <= end; i++) result.push(i);
      return result;
    }
    return [parseInt(part, 10)];
  }

  static async removeSchedule(workflowId: string): Promise<void> {
    await redis.del(`exec:cron:${workflowId}`);
  }

  static async getScheduledWorkflows(): Promise<string[]> {
    const keys = await redis.keys("exec:cron:*");
    return keys.map((k) => k.replace("exec:cron:", ""));
  }
}
