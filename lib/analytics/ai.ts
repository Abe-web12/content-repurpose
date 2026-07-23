import { prisma } from "@/lib/prisma";
import { cacheGet, cacheKey } from "@/lib/utils/cache";
import { subDays, format, startOfDay } from "date-fns";

export interface AIProviderUsage {
  providerId: string;
  model: string;
  requests: number;
  tokens: number;
  cost: number;
  latency: number;
  successRate: number;
}

export interface AIMetricPoint {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
  latency: number;
  successRate: number;
  promptSuccess: number;
  promptFailures: number;
  knowledgeRetrievals: number;
  ragAccuracy: number;
  workflowSuccess: number;
  agentSuccess: number;
}

export class AIAnalytics {
  static async getProviderUsage(organizationId: string, days: number): Promise<AIProviderUsage[]> {
    const cacheKeyStr = cacheKey("analytics", "ai", "providers", organizationId, `${days}`);
    return cacheGet<AIProviderUsage[]>(cacheKeyStr, async () => {
      const startDate = startOfDay(subDays(new Date(), days));
      const records = await prisma.analyticsAiMetrics.findMany({
        where: { organizationId, date: { gte: startDate } },
      });

      const map = new Map<string, AIProviderUsage>();
      for (const r of records) {
        const key = `${r.providerId || "unknown"}:${r.model || "unknown"}`;
        if (!map.has(key)) {
          map.set(key, { providerId: r.providerId || "unknown", model: r.model || "unknown", requests: 0, tokens: 0, cost: 0, latency: 0, successRate: 100 });
        }
        const p = map.get(key)!;
        p.requests += r.requests;
        p.tokens += r.totalTokens;
        p.cost += Number(r.totalCost);
        p.latency += r.avgLatency;
      }

      const result = Array.from(map.values());
      for (const p of result) {
        p.cost = Math.round(p.cost * 100) / 100;
      }
      return result;
    }, 300);
  }

  static async getMetrics(organizationId: string, days: number): Promise<AIMetricPoint[]> {
    const cacheKeyStr = cacheKey("analytics", "ai", "metrics", organizationId, `${days}`);
    return cacheGet<AIMetricPoint[]>(cacheKeyStr, async () => {
      const startDate = startOfDay(subDays(new Date(), days));
      const records = await prisma.analyticsAiMetrics.findMany({
        where: { organizationId, date: { gte: startDate } },
        orderBy: { date: "asc" },
      });

      const dataMap = new Map<string, AIMetricPoint>();
      for (const r of records) {
        const success = r.successCount + r.failureCount;
        dataMap.set(format(r.date, "yyyy-MM-dd"), {
          date: format(r.date, "yyyy-MM-dd"),
          requests: r.requests,
          tokens: r.totalTokens,
          cost: Number(r.totalCost),
          latency: r.avgLatency,
          successRate: success > 0 ? Math.round((r.successCount / success) * 1000) / 10 : 100,
          promptSuccess: r.promptSuccess,
          promptFailures: r.promptFailures,
          knowledgeRetrievals: r.knowledgeRetrievals,
          ragAccuracy: Number(r.ragAccuracy),
          workflowSuccess: r.workflowSuccess,
          agentSuccess: r.agentSuccess,
        });
      }

      const result: AIMetricPoint[] = [];
      for (let i = days; i >= 0; i--) {
        const date = format(startOfDay(subDays(new Date(), i)), "yyyy-MM-dd");
        result.push(dataMap.get(date) || {
          date, requests: 0, tokens: 0, cost: 0, latency: 0, successRate: 100,
          promptSuccess: 0, promptFailures: 0, knowledgeRetrievals: 0, ragAccuracy: 0,
          workflowSuccess: 0, agentSuccess: 0,
        });
      }
      return result;
    }, 300);
  }

  static async getOverview(organizationId: string, days = 30): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    averageLatency: number;
    successRate: number;
    promptSuccess: number;
    promptFailures: number;
    knowledgeRetrievals: number;
    ragAccuracy: number;
    workflowSuccess: number;
    agentSuccess: number;
  }> {
    const cacheKeyStr = cacheKey("analytics", "ai", "overview", organizationId, `${days}`);
    return cacheGet(cacheKeyStr, async () => {
      const startDate = startOfDay(subDays(new Date(), days));
      const records = await prisma.analyticsAiMetrics.findMany({
        where: { organizationId, date: { gte: startDate } },
      });
      const totals = records.reduce((acc, r) => {
        acc.requests += r.requests;
        acc.tokens += r.totalTokens;
        acc.cost += Number(r.totalCost);
        acc.latencySum += r.avgLatency;
        acc.successCount += r.successCount;
        acc.failureCount += r.failureCount;
        acc.promptSuccess += r.promptSuccess;
        acc.promptFailures += r.promptFailures;
        acc.knowledgeRetrievals += r.knowledgeRetrievals;
        acc.ragAccuracySum += Number(r.ragAccuracy);
        acc.workflowSuccess += r.workflowSuccess;
        acc.agentSuccess += r.agentSuccess;
        return acc;
      }, { requests: 0, tokens: 0, cost: 0, latencySum: 0, successCount: 0, failureCount: 0, promptSuccess: 0, promptFailures: 0, knowledgeRetrievals: 0, ragAccuracySum: 0, workflowSuccess: 0, agentSuccess: 0 });

      const successTotal = totals.successCount + totals.failureCount;
      const count = records.length || 1;
      return {
        totalRequests: totals.requests,
        totalTokens: totals.tokens,
        totalCost: Math.round(totals.cost * 100) / 100,
        averageLatency: Math.round(totals.latencySum / count),
        successRate: successTotal > 0 ? Math.round((totals.successCount / successTotal) * 1000) / 10 : 100,
        promptSuccess: totals.promptSuccess,
        promptFailures: totals.promptFailures,
        knowledgeRetrievals: totals.knowledgeRetrievals,
        ragAccuracy: Math.round((totals.ragAccuracySum / count) * 10) / 10,
        workflowSuccess: totals.workflowSuccess,
        agentSuccess: totals.agentSuccess,
      };
    }, 300);
  }
}