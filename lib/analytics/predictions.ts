import { prisma } from "@/lib/prisma";
import { cacheGet, cacheKey } from "@/lib/utils/cache";
import { subDays, format, addDays } from "date-fns";

export interface PredictionPoint {
  date: string;
  actual?: number;
  predicted: number;
  lowerBound: number;
  upperBound: number;
}

export interface PredictionResult {
  metric: string;
  period: string;
  predictions: PredictionPoint[];
  confidence: number;
  trend: "up" | "down" | "stable";
  growth: number;
  metadata: {
    historicalAvg: number;
    predictedAvg: number;
    seasonalityFactor: number;
    rSquared: number;
  };
}

export class PredictionEngine {
  static async forecast(params: {
    organizationId: string;
    metric: string;
    days: number;
    period: number;
  }): Promise<PredictionResult> {
    const { organizationId, metric, days, period } = params;
    const cacheKeyStr = cacheKey("predictions", organizationId, metric, `${days}`, `${period}`);

    return cacheGet<PredictionResult>(cacheKeyStr, async () => {
      const historicalData = await PredictionEngine.getHistoricalData(organizationId, metric, period);

      const values = historicalData.map(d => d.value);
      const dates = historicalData.map(d => d.date);

      const { slope, intercept, rSquared } = PredictionEngine.linearRegression(values);
      const avg = values.reduce((a, b) => a + b, 0) / (values.length || 1);
      const seasonalFactor = PredictionEngine.detectSeasonality(values);

      const lastDate = new Date(dates[dates.length - 1] || new Date());
      const predictions: PredictionPoint[] = [];

      const today = format(new Date(), "yyyy-MM-dd");

      for (let i = 0; i < historicalData.length; i++) {
        predictions.push({
          date: dates[i],
          actual: historicalData[i].value,
          predicted: Math.max(0, slope * i + intercept),
          lowerBound: 0,
          upperBound: 0,
        });
      }

      for (let i = 1; i <= days; i++) {
        const idx = historicalData.length + i - 1;
        const predicted = Math.max(0, slope * idx + intercept);
        const residualStd = PredictionEngine.computeResidualStd(values, predictions.slice(0, values.length).map(p => p.predicted));
        const forecastDate = addDays(lastDate, i);
        const dateStr = format(forecastDate, "yyyy-MM-dd");

        predictions.push({
          date: dateStr,
          predicted: Math.round(predicted * 100) / 100,
          lowerBound: Math.max(0, Math.round((predicted - 1.96 * residualStd) * 100) / 100),
          upperBound: Math.max(0, Math.round((predicted + 1.96 * residualStd) * 100) / 100),
        });
      }

      const historicalAvg = avg;
      const predictedValues = predictions.slice(-days).map(p => p.predicted);
      const predictedAvg = predictedValues.reduce((a, b) => a + b, 0) / (predictedValues.length || 1);
      const growth = historicalAvg > 0 ? Math.round(((predictedAvg - historicalAvg) / historicalAvg) * 100) : 0;

      return {
        metric,
        period: `${days}d`,
        predictions,
        confidence: Math.max(0, Math.min(100, Math.round(rSquared * 100))),
        trend: slope > 0.01 ? "up" : slope < -0.01 ? "down" : "stable",
        growth,
        metadata: {
          historicalAvg: Math.round(historicalAvg * 100) / 100,
          predictedAvg: Math.round(predictedAvg * 100) / 100,
          seasonalityFactor: seasonalFactor,
          rSquared: Math.round(rSquared * 100) / 100,
        },
      };
    }, 1800);
  }

  private static async getHistoricalData(organizationId: string, metric: string, days: number): Promise<{ date: string; value: number }[]> {
    const startDate = subDays(new Date(), days);

      const records = await prisma.revenueMetrics.findMany({
        where: { date: { gte: startDate } },
        orderBy: { date: "asc" },
      });

    if (records.length === 0) {
      const data: { date: string; value: number }[] = [];
      for (let i = days; i >= 0; i--) {
        data.push({ date: format(subDays(new Date(), i), "yyyy-MM-dd"), value: 0 });
      }
      return data;
    }

    return records.map(r => ({
      date: format(r.date, "yyyy-MM-dd"),
      value: PredictionEngine.getMetricValue(r, metric),
    }));
  }

  private static getMetricValue(record: any, metric: string): number {
    switch (metric) {
      case "revenue": case "netRevenue": return Number(record.netRevenue) || 0;
      case "mrr": return Number(record.mrr) || 0;
      case "arr": return Number(record.arr) || 0;
      case "growth": return Number(record.mrr) || 0;
      case "churn": return Number(record.churnRate) || 0;
      case "ltv": return Number(record.ltv) || 0;
      case "credits": return Number(record.creditConsumption) || 0;
      case "storage": return Number(record.storageUsage) || 0;
      case "workflows": return Number(record.workflowExecutions) || 0;
      case "api_usage": return Number(record.apiRequests) || 0;
      case "organizations": return Number(record.activeOrganizations) || 0;
      default: return Number(record.mrr) || 0;
    }
  }

  private static linearRegression(values: number[]): { slope: number; intercept: number; rSquared: number } {
    const n = values.length;
    if (n < 2) return { slope: 0, intercept: values[0] || 0, rSquared: 1 };

    const indices = values.map((_, i) => i);
    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
    const sumY2 = values.reduce((sum, y) => sum + y * y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    const ssRes = values.reduce((sum, y, i) => sum + Math.pow(y - (slope * i + intercept), 2), 0);
    const ssTot = sumY2 - (sumY * sumY) / n;
    const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 1;

    return { slope, intercept, rSquared: Math.max(0, Math.min(1, rSquared)) };
  }

  private static computeResidualStd(actual: number[], predicted: number[]): number {
    const n = Math.min(actual.length, predicted.length);
    if (n < 2) return 0;
    const residuals = actual.slice(0, n).map((a, i) => Math.abs(a - predicted[i]));
    const mean = residuals.reduce((a, b) => a + b, 0) / n;
    const variance = residuals.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (n - 1);
    return Math.sqrt(variance);
  }

  private static detectSeasonality(values: number[]): number {
    if (values.length < 14) return 0;
    let weeklyPattern = 0;
    for (let i = 7; i < values.length; i++) {
      weeklyPattern += Math.abs(values[i] - values[i - 7]);
    }
    return weeklyPattern / (values.length - 7) / (values.reduce((a, b) => a + b, 0) / values.length || 1);
  }
}
