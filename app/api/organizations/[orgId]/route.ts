import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { getOrgSession, requirePermission } from "@/lib/utils/org-access";
import { updateOrganizationSchema } from "@/lib/validations/organization";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await params;
    const session = await getOrgSession(orgId);
    requirePermission(session, "read");

    const organization = await prisma.organizations.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: {
            members: true,
            brandKits: true,
            templates: true,
          },
        },
      },
    });

    if (!organization) throw new AppError("Organization not found", 404);

    return NextResponse.json({
      data: {
        ...organization,
        myRole: session.member.role,
      },
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await params;
    const session = await getOrgSession(orgId);
    requirePermission(session, "manage_organization");

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = updateOrganizationSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(validation.error.errors.map((e) => e.message).join(", "), 400);
    }

    const data: Record<string, unknown> = {};
    if (validation.data.name) data.name = validation.data.name;
    if (validation.data.slug) {
      const finalSlug = validation.data.slug;
      const existing = await prisma.organizations.findUnique({
        where: { slug: finalSlug },
      });
      if (existing && existing.id !== orgId) {
        throw new AppError("An organization with this slug already exists", 409);
      }
      data.slug = finalSlug;
    }
    if (validation.data.logo !== undefined) data.logo = validation.data.logo;
    if (validation.data.name) data.name = validation.data.name;

    const organization = await prisma.organizations.update({
      where: { id: orgId },
      data,
    });

    return NextResponse.json({ data: organization });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await params;
    const session = await getOrgSession(orgId);
    requirePermission(session, "manage_organization");

    if (session.member.role !== "OWNER") {
      throw new AppError("Only the organization owner can delete the organization", 403);
    }

    await prisma.organizations.delete({ where: { id: orgId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
