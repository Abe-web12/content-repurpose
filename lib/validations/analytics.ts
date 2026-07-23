import { z } from "zod";

export const analyticsPeriodSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  period: z.enum(["7d", "30d", "90d", "365d", "custom"]).optional().default("30d"),
});

export const analyticsFilterSchema = z.object({
  organizationId: z.string().optional(),
  segmentId: z.string().optional(),
  teamId: z.string().optional(),
  userId: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  metric: z.string().optional(),
});

export const dashboardSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  layout: z.record(z.unknown()).optional(),
  isDefault: z.boolean().optional(),
});

export const dashboardUpdateSchema = dashboardSchema.partial();

export const reportSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["executive", "revenue", "customers", "ai", "workflows", "performance", "custom"]),
  config: z.record(z.unknown()).optional(),
  filters: z.record(z.unknown()).optional(),
  format: z.enum(["csv", "pdf", "excel", "json"]).optional().default("pdf"),
});

export const reportUpdateSchema = reportSchema.partial();

export const reportScheduleSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
  recipients: z.array(z.string().email()).min(1),
  format: z.enum(["csv", "pdf", "excel", "json"]).optional().default("pdf"),
});

export const alertSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  metric: z.string().min(1),
  condition: z.enum(["gt", "lt", "gte", "lte", "eq", "neq"]),
  threshold: z.number(),
  window: z.number().int().positive().optional().default(300),
  channels: z.array(z.enum(["email", "webhook", "slack"])).optional().default(["email"]),
});

export const alertUpdateSchema = alertSchema.partial();

export const segmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["customer", "user", "team"]).optional().default("customer"),
  criteria: z.record(z.unknown()),
});

export const segmentUpdateSchema = segmentSchema.partial();

export const benchmarkSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  metric: z.string().min(1),
  period: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]).optional().default("monthly"),
  groupBy: z.string().optional(),
  filters: z.record(z.unknown()).optional(),
});

export const kpiSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  metric: z.string().min(1),
  formula: z.string().optional(),
  unit: z.string().optional(),
  target: z.number().optional(),
  warning: z.number().optional(),
  critical: z.number().optional(),
  direction: z.enum(["up", "down"]).optional().default("up"),
});

export type KpiInput = z.infer<typeof kpiSchema>;
export type SegmentInput = z.infer<typeof segmentSchema>;
export type DashboardInput = z.infer<typeof dashboardSchema>;

export const predictionSchema = z.object({
  metric: z.enum(["revenue", "mrr", "arr", "growth", "churn", "ltv", "credits", "storage", "workflows", "api_usage", "organizations"]),
  days: z.enum(["7", "30", "90", "365"]),
  period: z.enum(["7d", "30d", "90d", "365d", "custom"]).optional().default("90d"),
});
