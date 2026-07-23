import { NextRequest, NextResponse } from "next/server";
import { mutationHandler, queryHandler } from "@/lib/api/shared-middleware";
import { TeamManager, Permission } from "@/lib/organizations";

export const runtime = "nodejs";

export const GET = queryHandler({
  permission: Permission.TEAM_VIEW,
  handler: async (req, ctx) => {
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId") || undefined;
    const teams = await TeamManager.list(ctx.orgId!, departmentId);
    return NextResponse.json({ data: teams });
  },
  name: "teams.list",
});

export const POST = mutationHandler({
  permission: Permission.TEAM_CREATE,
  rateLimit: { maxRequests: 20 },
  audit: (body: any) => ({
    action: "team.create",
    entityType: "team",
    metadata: { name: body.name },
  }),
  handler: async (req, ctx, body: { name: string; description?: string; departmentId?: string }) => {
    const team = await TeamManager.create(ctx.orgId!, ctx.userId, body);
    return NextResponse.json({ data: team }, { status: 201 });
  },
  name: "team.create",
});
