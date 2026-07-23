export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";
import { z } from "zod";

const searchSchema = z.object({
  q: z.string().min(2, "Search query must be at least 2 characters").max(200),
});

const SEARCH_LIMIT = 5;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";

    const parsed = searchSchema.safeParse({ q });
    if (!parsed.success) {
      return NextResponse.json({ data: { generations: [], templates: [], voiceProfiles: [], brandKits: [] } });
    }

    const searchPattern = `%${q.replace(/[_%]/g, "\\$&")}%`;

    const generations = await prisma.$queryRaw<Array<{ id: string; title: string | null; output_format: string | null; output_content: string | null; content: string | null; created_at: Date; rank: number }>>`
      SELECT id, title, output_format, output_content, content, created_at,
        GREATEST(
          similarity(COALESCE(content, ''), ${q}),
          similarity(COALESCE(output_content, ''), ${q}),
          similarity(COALESCE(title, ''), ${q})
        ) AS rank
      FROM generations
      WHERE user_id = ${user.id} AND deleted_at IS NULL
        AND (content ILIKE ${searchPattern} ESCAPE ${"\\"} OR output_content ILIKE ${searchPattern} ESCAPE ${"\\"} OR title ILIKE ${searchPattern} ESCAPE ${"\\"})
      ORDER BY rank DESC
      LIMIT ${SEARCH_LIMIT}
    `;

    const templates = await prisma.$queryRaw<Array<{ id: string; name: string; description: string | null; category: string; platform: string; rank: number }>>`
      SELECT id, name, description, category, platform,
        GREATEST(
          similarity(COALESCE(name, ''), ${q}),
          similarity(COALESCE(description, ''), ${q})
        ) AS rank
      FROM content_templates
      WHERE (is_custom = false OR user_id = ${user.id})
        AND (name ILIKE ${searchPattern} ESCAPE ${"\\"} OR description ILIKE ${searchPattern} ESCAPE ${"\\"})
      ORDER BY rank DESC
      LIMIT ${SEARCH_LIMIT}
    `;

    const voiceProfiles = await prisma.$queryRaw<Array<{ id: string; name: string; description: string | null; tone: string; rank: number }>>`
      SELECT id, name, description, tone,
        GREATEST(
          similarity(COALESCE(name, ''), ${q}),
          similarity(COALESCE(description, ''), ${q})
        ) AS rank
      FROM voice_profiles
      WHERE user_id = ${user.id}
        AND (name ILIKE ${searchPattern} ESCAPE ${"\\"} OR description ILIKE ${searchPattern} ESCAPE ${"\\"})
      ORDER BY rank DESC
      LIMIT ${SEARCH_LIMIT}
    `;

    const brandKits = await prisma.$queryRaw<Array<{ id: string; company_name: string; brand_voice: string; rank: number }>>`
      SELECT id, company_name, brand_voice,
        similarity(COALESCE(company_name, ''), ${q}) AS rank
      FROM brand_kits
      WHERE user_id = ${user.id}
        AND company_name ILIKE ${searchPattern} ESCAPE ${"\\"}
      ORDER BY rank DESC
      LIMIT ${SEARCH_LIMIT}
    `;

    return NextResponse.json({
      data: {
        generations: Array.from(generations).map((g) => ({
          id: g.id,
          title: g.title || "Untitled",
          type: g.output_format,
          snippet: (g.output_content || g.content || "").slice(0, 150),
          created_at: g.created_at instanceof Date ? g.created_at.toISOString() : String(g.created_at),
          score: Math.round(g.rank * 100) / 100,
        })),
        templates: Array.from(templates).map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          platform: t.platform,
        })),
        voiceProfiles: Array.from(voiceProfiles).map((v) => ({
          id: v.id,
          name: v.name,
          description: v.description,
          tone: v.tone,
        })),
        brandKits: Array.from(brandKits).map((b) => ({
          id: b.id,
          company_name: b.company_name,
          brand_voice: b.brand_voice,
        })),
      },
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
