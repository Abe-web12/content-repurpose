export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { queryHandler, mutationHandler } from "@/lib/api/shared-middleware";
import { prisma } from "@/lib/prisma";

const GET = queryHandler({
  rateLimit: { windowMs: 60_000, maxRequests: 30 },
  name: "notifications.preferences.get",
  handler: async (request, ctx) => {
    const user = await prisma.users.findUnique({
      where: { id: ctx.userId },
      select: {
        notifyOnBilling: true,
        notifyOnGeneration: true,
        notifyOnSchedule: true,
      },
    });

    return NextResponse.json({
      data: {
        billing: user?.notifyOnBilling ?? true,
        generation: user?.notifyOnGeneration ?? true,
        schedule: user?.notifyOnSchedule ?? true,
        push: true,
        email: user?.notifyOnBilling ?? true,
      },
    });
  },
});

const PATCH = mutationHandler({
  rateLimit: { windowMs: 60_000, maxRequests: 20 },
  name: "notifications.preferences.patch",
  handler: async (request, ctx, body: any) => {
    const { billing, generation, schedule, push, email } = body as {
      billing?: boolean;
      generation?: boolean;
      schedule?: boolean;
      push?: boolean;
      email?: boolean;
    };

    await prisma.users.update({
      where: { id: ctx.userId },
      data: {
        ...(billing !== undefined ? { notifyOnBilling: billing } : {}),
        ...(generation !== undefined ? { notifyOnGeneration: generation } : {}),
        ...(schedule !== undefined ? { notifyOnSchedule: schedule } : {}),
      },
    });

    return NextResponse.json({ data: { updated: true } });
  },
});

export { GET, PATCH };
