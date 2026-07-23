export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { rateLimitByUser } from "@/lib/utils/rate-limit";

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];
  return lines.join("\r\n");
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = await rateLimitByUser(user.id, { windowMs: 60_000, maxRequests: 10 });
    if (!limit.success) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv"; // csv | json
    const days = Math.min(Math.max(parseInt(searchParams.get("days") || "30"), 1), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const generations = await prisma.generations.findMany({
      where: { userId: user.id, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        outputFormat: true,
        inputType: true,
        tokensUsed: true,
        modelUsed: true,
        isFavorite: true,
        createdAt: true,
      },
    });

    const rows = generations.map((g) => ({
      id: g.id,
      output_format: g.outputFormat ?? "",
      input_type: g.inputType ?? "",
      tokens_used: g.tokensUsed ?? 0,
      model_used: g.modelUsed ?? "",
      is_favorite: g.isFavorite ? "true" : "false",
      created_at: g.createdAt.toISOString(),
    }));

    if (format === "json") {
      return new NextResponse(JSON.stringify({ data: rows }, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="analytics-export-${days}d.json"`,
        },
      });
    }

    const csv = toCSV(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="analytics-export-${days}d.csv"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[analytics/export]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}