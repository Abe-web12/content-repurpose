import { redis } from "@/lib/redis";

export type MetricType = "counter" | "gauge" | "histogram";

export interface MetricEvent {
  name: string;
  type: MetricType;
  value: number;
  tags?: Record<string, string>;
  timestamp?: number;
}

const METRICS_PREFIX = "metrics:";
const ALERTS_PREFIX = "alerts:";

export class Observability {
  static async trackMetric(event: MetricEvent): Promise<void> {
    const ts = event.timestamp ?? Date.now();
    const minuteKey = `${METRICS_PREFIX}${event.name}:${Math.floor(ts / 60000)}`;

    const pipeline = redis.pipeline();

    switch (event.type) {
      case "counter":
        pipeline.hincrby(minuteKey, "count", Math.round(event.value));
        pipeline.hincrby(minuteKey, "total", Math.round(event.value));
        break;
      case "gauge":
        pipeline.hset(minuteKey, { value: event.value, timestamp: ts });
        break;
      case "histogram":
        pipeline.hincrby(minuteKey, "count", 1);
        pipeline.rpush(`${minuteKey}:values`, event.value.toString());
        pipeline.ltrim(`${minuteKey}:values`, -1000, -1);
        break;
    }

    if (event.tags) {
      for (const [tagKey, tagValue] of Object.entries(event.tags)) {
        pipeline.hincrby(`${METRICS_PREFIX}${event.name}:tags:${tagKey}`, tagValue, 1);
      }
    }

    pipeline.expire(minuteKey, 86400 * 7);

    await pipeline.exec();
  }

  static async incrementCounter(name: string, tags?: Record<string, string>): Promise<void> {
    await this.trackMetric({ name, type: "counter", value: 1, tags });
  }

  static async recordGauge(name: string, value: number, tags?: Record<string, string>): Promise<void> {
    await this.trackMetric({ name, type: "gauge", value, tags });
  }

  static async recordHistogram(name: string, value: number, tags?: Record<string, string>): Promise<void> {
    await this.trackMetric({ name, type: "histogram", value, tags });
  }

  static async getMetricStats(
    name: string,
    timeRangeMinutes: number = 60,
  ): Promise<{ count: number; total: number; avg: number; min: number; max: number }> {
    const now = Date.now();
    const startMinute = Math.floor((now - timeRangeMinutes * 60000) / 60000);
    const endMinute = Math.floor(now / 60000);

    let totalCount = 0;
    let totalSum = 0;
    const values: number[] = [];

    for (let m = startMinute; m <= endMinute; m++) {
      const data = await redis.hgetall<Record<string, string>>(`${METRICS_PREFIX}${name}:${m}`);
      if (data) {
        const count = parseInt(data.count ?? "0", 10);
        totalCount += count;
        totalSum += parseInt(data.total ?? "0", 10);

        const rawValues = await redis.lrange(`${METRICS_PREFIX}${name}:${m}:values`, 0, -1);
        for (const v of rawValues) {
          const num = parseFloat(v);
          if (!isNaN(num)) values.push(num);
        }
      }
    }

    return {
      count: totalCount,
      total: totalSum,
      avg: values.length > 0 ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 : 0,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
    };
  }

  static async setAlert(
    name: string,
    condition: { metric: string; operator: "gt" | "lt" | "gte" | "lte"; threshold: number },
    notification: { type: "email" | "webhook"; target: string },
    enabled: boolean = true,
  ): Promise<void> {
    const alert = { name, condition, notification, enabled, createdAt: Date.now() };
    await redis.hset(`${ALERTS_PREFIX}config`, { [name]: JSON.stringify(alert) });
  }

  static async checkAlerts(): Promise<Array<{ name: string; triggered: boolean; currentValue: number }>> {
    const configs = await redis.hgetall<Record<string, string>>(`${ALERTS_PREFIX}config`);
    if (!configs) return [];

    const results: Array<{ name: string; triggered: boolean; currentValue: number }> = [];

    for (const [name, configStr] of Object.entries(configs)) {
      try {
        const config = JSON.parse(configStr);
        if (!config.enabled) continue;

        const stats = await this.getMetricStats(config.condition.metric, 5);
        const currentValue = stats.avg || stats.total;
        let triggered = false;

        switch (config.condition.operator) {
          case "gt": triggered = currentValue > config.condition.threshold; break;
          case "lt": triggered = currentValue < config.condition.threshold; break;
          case "gte": triggered = currentValue >= config.condition.threshold; break;
          case "lte": triggered = currentValue <= config.condition.threshold; break;
        }

        results.push({ name, triggered, currentValue });
      } catch {
        continue;
      }
    }

    return results;
  }

  static async trackRequest(
    path: string,
    method: string,
    statusCode: number,
    durationMs: number,
    userId?: string,
  ): Promise<void> {
    const tags: Record<string, string> = {
      path: path.split("/")[1] ?? "unknown",
      method,
      status: String(Math.floor(statusCode / 100) * 100),
    };

    await Promise.all([
      this.incrementCounter("api.requests", tags),
      this.recordHistogram("api.latency", durationMs, tags),
      this.incrementCounter(`api.status.${statusCode}`, tags),
    ]);

    if (durationMs > 5000) {
      await this.incrementCounter("api.slow_requests", { ...tags, path });
    }
  }
}
