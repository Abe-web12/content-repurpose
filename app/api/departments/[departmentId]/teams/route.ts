import { NextRequest, NextResponse } from "next/server";
import { mutationHandler } from "@/lib/api/shared-middleware";
import { DepartmentManager, Permission } from "@/lib/organizations";

export const runtime = "nodejs";

export const POST = mutationHandler({
  permission: Permission.DEPARTMENT_MANAGE_TEAMS,
  rateLimit: { maxRequests: 30 },
  audit: (body: any) => ({
    action: "department.assign_team",
    entityType: "department",
    metadata: { teamId: body.teamId },
  }),
  handler: async (req, ctx, body: { teamId: string }, params) => {
    await DepartmentManager.assignTeam(params!.departmentId, ctx.orgId!, ctx.userId, body.teamId);
    return NextResponse.json({ data: { success: true } }, { status: 201 });
  },
  name: "department.teams.assign",
});

export const DELETE = mutationHandler({
  permission: Permission.DEPARTMENT_MANAGE_TEAMS,
  audit: (body: any) => ({
    action: "department.unassign_team",
    entityType: "department",
    metadata: { teamId: body.teamId },
  }),
  handler: async (req, ctx, body: { teamId: string }, params) => {
    await DepartmentManager.unassignTeam(params!.departmentId, ctx.orgId!, ctx.userId, body.teamId);
    return NextResponse.json({ data: { success: true } });
  },
  name: "department.teams.unassign",
});
