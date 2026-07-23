export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { brandKitSchema } from "@/lib/validations/brand-kit";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";

function transformBrandKit(kit: any) {
  return {
    id: kit.id,
    user_id: kit.userId,
    company_name: kit.companyName || "",
    company_description: kit.companyDescription || "",
    target_audience: kit.targetAudience || "",
    brand_colors: kit.brandColors || [],
    brand_voice: kit.brandVoice || "",
    logo_url: kit.logoUrl || "",
    created_at: kit.createdAt?.toISOString?.() || kit.createdAt,
    updated_at: kit.updatedAt?.toISOString?.() || kit.updatedAt,
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await prisma.brandKits.findFirst({
      where: { userId: user.id },
    });

    return NextResponse.json({ data: data ? transformBrandKit(data) : null });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = brandKitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.brandKits.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    let result;

    if (existing) {
      result = await prisma.brandKits.update({
        where: { id: existing.id },
        data: {
          companyName: parsed.data.company_name,
          companyDescription: parsed.data.company_description,
          targetAudience: parsed.data.target_audience,
          brandColors: parsed.data.brand_colors,
          brandVoice: parsed.data.brand_voice,
          logoUrl: parsed.data.logo_url,
        },
      });
    } else {
      result = await prisma.brandKits.create({
        data: {
          userId: user.id,
          companyName: parsed.data.company_name,
          companyDescription: parsed.data.company_description,
          targetAudience: parsed.data.target_audience,
          brandColors: parsed.data.brand_colors,
          brandVoice: parsed.data.brand_voice,
          logoUrl: parsed.data.logo_url,
        },
      });
    }

    return NextResponse.json({ data: transformBrandKit(result) });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
