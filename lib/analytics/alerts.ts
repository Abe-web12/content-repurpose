import { prisma } from "@/lib/prisma";
import { cacheInvalidate, cacheKey } from "@/lib/utils/cache";
import { subMinutes, format } from "date-fns";
import { AnalyticsEngine } from "./engine";
import { AlertDispatcher } from "./alert-dispatch";

interface AlertEvaluation {
  triggered: boolean;
  value: number;
  message: string;
}

export class AlertEngine {
  static async evaluateAlerts(): Promise<number> {
    const alerts = await prisma.analyticsAlerts.findMany({
      where: { enabled: true },
    });

    let triggered = 0;
    for (const alert of alerts) {
      try {
        const evaluation = await AlertEngine.evaluateAlert(alert);
        if (evaluation.triggered) {
          const event = await AlertEngine.createAlertEvent(alert, evaluation);
          await prisma.analyticsAlerts.update({
            where: { id: alert.id },
            data: { lastTriggeredAt: new Date() },
          });

          await AlertDispatcher.dispatchAlert(alert, {
            id: event.id,
            value: evaluation.value,
            threshold: alert.threshold,
            condition: alert.condition,
            message: evaluation.message,
            createdAt: new Date(),
          }).catch(() => {});

          triggered++;
        }
      } catch {
        continue;
      }
    }

    return triggered;
  }

  static async evaluateAlert(alert: any): Promise<AlertEvaluation> {
    const currentValue = await AlertEngine.getMetricValue(alert.organizationId, alert.metric);
    const threshold = Number(alert.threshold);
    const condition = alert.condition;
    let triggered = false;

    switch (condition) {
      case "gt": triggered = currentValue > threshold; break;
      case "lt": triggered = currentValue < threshold; break;
      case "gte": triggered = currentValue >= threshold; break;
      case "lte": triggered = currentValue <= threshold; break;
      case "eq": triggered = currentValue === threshold; break;
      case "neq": triggered = currentValue !== threshold; break;
    }

    const metricLabel = alert.metric.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    const direction = condition === "gt" || condition === "gte" ? "exceeded" : "dropped below";

    return {
      triggered,
      value: Math.round(currentValue * 100) / 100,
      message: triggered
        ? `${metricLabel} ${direction} threshold: ${currentValue.toFixed(2)} (threshold: ${threshold})`
        : "",
    };
  }

  static async getMetricValue(organizationId: string, metric: string): Promise<number> {
    const metrics = await AnalyticsEngine.getExecutiveMetrics(organizationId);

    const metricMap: Record<string, number> = {
      mrr: metrics.mrr,
      arr: metrics.arr,
      net_revenue: metrics.netRevenue,
      gross_revenue: metrics.grossRevenue,
      active_customers: metrics.activeCustomers,
      new_customers: metrics.newCustomers,
      churn: metrics.churnRate,
      expansion_revenue: metrics.expansionRevenue,
      contraction_revenue: metrics.contractionRevenue,
      ltv: metrics.ltv,
      cac: metrics.cac,
      payback_period: metrics.paybackPeriod,
      active_organizations: metrics.activeOrganizations,
      api_usage: metrics.apiUsage,
      ai_usage: metrics.aiUsage,
      credit_consumption: metrics.creditConsumption,
      storage_usage: metrics.storageUsage,
      workflow_executions: metrics.workflowExecutions,
      marketplace_installs: metrics.marketplaceInstalls,
      revenue_drop: metrics.netRevenue,
      high_churn: metrics.churnRate,
      api_spike: metrics.apiUsage,
      failed_workflows: 0,
      failed_ai_requests: 0,
      provider_outage: 0,
      low_credits: metrics.creditConsumption,
    };

    return metricMap[metric] || 0;
  }

  static async createAlertEvent(alert: { id: string; organizationId: string; metric: string; condition: string; threshold: number; name: string }, evaluation: AlertEvaluation): Promise<{ id: string; organizationId: string; value: number; threshold: number; condition: string; message: string; createdAt: Date }> {
    const event = await prisma.analyticsAlertEvents.create({
      data: {
        alertId: alert.id,
        organizationId: alert.organizationId,
        metric: alert.metric,
        value: evaluation.value,
        condition: alert.condition,
        threshold: alert.threshold,
        message: evaluation.message,
        status: "triggered",
      },
    });

    return {
      id: event.id,
      organizationId: event.organizationId,
      value: event.value,
      threshold: event.threshold,
      condition: event.condition,
      message: event.message,
      createdAt: event.createdAt,
    };
  }

  static async acknowledgeAlert(eventId: string): Promise<void> {
    await prisma.analyticsAlertEvents.update({
      where: { id: eventId },
      data: { status: "acknowledged", acknowledgedAt: new Date() },
    });
  }

  static async resolveAlert(eventId: string): Promise<void> {
    await prisma.analyticsAlertEvents.update({
      where: { id: eventId },
      data: { status: "resolved", resolvedAt: new Date() },
    });
  }

  static async getAlertHistory(organizationId: string, limit = 50): Promise<any[]> {
    const events = await prisma.analyticsAlertEvents.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const alertIds = [...new Set(events.map(e => e.alertId))];
    const alerts = await prisma.analyticsAlerts.findMany({
      where: { id: { in: alertIds } },
      select: { id: true, name: true, metric: true },
    });
    const alertMap = new Map(alerts.map(a => [a.id, a]));

    return events.map(e => ({
      ...e,
      alert: alertMap.get(e.alertId) || null,
    }));
  }
}
