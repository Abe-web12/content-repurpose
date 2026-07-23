export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { parseBody } from "@/lib/utils/api-errors";
import { requireAnalyticsAccess } from "@/lib/analytics/auth";
import { prisma } from "@/lib/prisma";
import { reportUpdateSchema, reportScheduleSchema } from "@/lib/validations/analytics";
import { ReportEngine } from "@/lib/analytics/reports";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const report = await prisma.analyticsReports.findUnique({ where: { id } });
    if (!report) throw new AppError("Report not found", 404);
    await requireAnalyticsAccess(report.organizationId);

    return NextResponse.json({ data: report });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const existing = await prisma.analyticsReports.findUnique({ where: { id } });
    if (!existing) throw new AppError("Report not found", 404);
    const auth = await requireAnalyticsAccess(existing.organizationId);

    const limitResult = await rateLimit(`analytics:reports:update:${auth.userId}`, { windowMs: 60000, maxRequests: 30 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const body = await parseBody(request);
    const data = reportUpdateSchema.parse(body);

    const report = await prisma.analyticsReports.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.config !== undefined ? { config: data.config as object } : {}),
        ...(data.filters !== undefined ? { filters: data.filters as object } : {}),
        ...(data.format !== undefined ? { format: data.format } : {}),
      },
    });

    return NextResponse.json({ data: report });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const existing = await prisma.analyticsReports.findUnique({ where: { id } });
    if (!existing) throw new AppError("Report not found", 404);
    await requireAnalyticsAccess(existing.organizationId);

    await prisma.analyticsReports.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const existing = await prisma.analyticsReports.findUnique({ where: { id } });
    if (!existing) throw new AppError("Report not found", 404);
    const auth = await requireAnalyticsAccess(existing.organizationId);

    const body = await parseBody(request);
    const { frequency, recipients, format } = reportScheduleSchema.parse(body);

    await ReportEngine.scheduleReport(existing, { frequency, recipients, format });
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
