import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const memberships = await prisma.organizationMembers.findMany({
      where: { userId: user.id },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, logo: true },
        },
      },
      orderBy: { role: "asc" },
    });

    const organizations = memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      logo: m.organization.logo,
      role: m.role,
    }));

    return NextResponse.json({
      data: {
        organizations,
        personal: {
          id: "personal",
          name: "Personal Workspace",
          slug: null,
          logo: null,
          role: "OWNER",
        },
      },
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
