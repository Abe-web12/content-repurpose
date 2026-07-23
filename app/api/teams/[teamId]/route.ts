import { NextRequest, NextResponse } from "next/server";
import { mutationHandler, queryHandler } from "@/lib/api/shared-middleware";
import { TeamManager, Permission } from "@/lib/organizations";

export const runtime = "nodejs";

export const GET = queryHandler({
  permission: Permission.TEAM_VIEW,
  handler: async (req, ctx, params) => {
    const team = await TeamManager.getById(params!.teamId, ctx.orgId!);
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    return NextResponse.json({ data: team });
  },
  name: "team.get",
});

export const PATCH = mutationHandler({
  permission: Permission.TEAM_EDIT,
  audit: (body: any) => ({
    action: "team.update",
    entityType: "team",
    metadata: body,
  }),
  handler: async (req, ctx, body: { name?: string; description?: string; leadId?: string | null }, params) => {
    const team = await TeamManager.update(params!.teamId, ctx.orgId!, ctx.userId, body);
    return NextResponse.json({ data: team });
  },
  name: "team.update",
});

export const DELETE = mutationHandler({
  permission: Permission.TEAM_DELETE,
  audit: () => ({ action: "team.delete", entityType: "team" }),
  handler: async (req, ctx, _body, params) => {
    await TeamManager.delete(params!.teamId, ctx.orgId!, ctx.userId);
    return NextResponse.json({ data: { success: true } });
  },
  name: "team.delete",
});
