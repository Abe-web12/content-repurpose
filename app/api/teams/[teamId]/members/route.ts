import { NextRequest, NextResponse } from "next/server";
import { mutationHandler, queryHandler } from "@/lib/api/shared-middleware";
import { TeamManager, Permission } from "@/lib/organizations";

export const runtime = "nodejs";

export const GET = queryHandler({
  permission: Permission.TEAM_VIEW,
  handler: async (req, ctx, params) => {
    const members = await TeamManager.getMembers(params!.teamId, ctx.orgId!);
    return NextResponse.json({ data: members });
  },
  name: "team.members.list",
});

export const POST = mutationHandler({
  permission: Permission.TEAM_MANAGE_MEMBERS,
  audit: (body: any) => ({
    action: "team.member.add",
    entityType: "team",
    metadata: { userId: body.userId },
  }),
  handler: async (req, ctx, body: { userId: string }, params) => {
    await TeamManager.addMember(params!.teamId, ctx.orgId!, ctx.userId, body.userId);
    return NextResponse.json({ data: { success: true } }, { status: 201 });
  },
  name: "team.members.add",
});

export const DELETE = mutationHandler({
  permission: Permission.TEAM_MANAGE_MEMBERS,
  audit: (body: any) => ({
    action: "team.member.remove",
    entityType: "team",
    metadata: { userId: body.userId },
  }),
  handler: async (req, ctx, body: { userId: string }, params) => {
    await TeamManager.removeMember(params!.teamId, ctx.orgId!, ctx.userId, body.userId);
    return NextResponse.json({ data: { success: true } });
  },
  name: "team.members.remove",
});
