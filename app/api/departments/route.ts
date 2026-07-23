import { NextRequest, NextResponse } from "next/server";
import { mutationHandler, queryHandler } from "@/lib/api/shared-middleware";
import { DepartmentManager, Permission } from "@/lib/organizations";

export const runtime = "nodejs";

export const GET = queryHandler({
  permission: Permission.DEPARTMENT_VIEW,
  handler: async (req, ctx) => {
    const departments = await DepartmentManager.list(ctx.orgId!);
    return NextResponse.json({ data: departments });
  },
  name: "departments.list",
});

export const POST = mutationHandler({
  permission: Permission.DEPARTMENT_CREATE,
  rateLimit: { maxRequests: 20 },
  audit: (body: any) => ({
    action: "department.create",
    entityType: "department",
    metadata: { name: body.name },
  }),
  handler: async (req, ctx, body: { name: string; description?: string }) => {
    const department = await DepartmentManager.create(ctx.orgId!, ctx.userId, body);
    return NextResponse.json({ data: department }, { status: 201 });
  },
  name: "department.create",
});
