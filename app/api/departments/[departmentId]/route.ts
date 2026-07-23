import { NextRequest, NextResponse } from "next/server";
import { mutationHandler, queryHandler } from "@/lib/api/shared-middleware";
import { DepartmentManager, Permission } from "@/lib/organizations";

export const runtime = "nodejs";

export const GET = queryHandler({
  permission: Permission.DEPARTMENT_VIEW,
  handler: async (req, ctx, params) => {
    const department = await DepartmentManager.getById(params!.departmentId, ctx.orgId!);
    if (!department) return NextResponse.json({ error: "Department not found" }, { status: 404 });
    return NextResponse.json({ data: department });
  },
  name: "department.get",
});

export const PATCH = mutationHandler({
  permission: Permission.DEPARTMENT_EDIT,
  audit: (body: any) => ({
    action: "department.update",
    entityType: "department",
    metadata: body,
  }),
  handler: async (req, ctx, body: { name?: string; description?: string; headId?: string | null }, params) => {
    const department = await DepartmentManager.update(params!.departmentId, ctx.orgId!, ctx.userId, body);
    return NextResponse.json({ data: department });
  },
  name: "department.update",
});

export const DELETE = mutationHandler({
  permission: Permission.DEPARTMENT_DELETE,
  audit: () => ({ action: "department.delete", entityType: "department" }),
  handler: async (req, ctx, _body, params) => {
    await DepartmentManager.delete(params!.departmentId, ctx.orgId!, ctx.userId);
    return NextResponse.json({ data: { success: true } });
  },
  name: "department.delete",
});
