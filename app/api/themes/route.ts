import { NextRequest, NextResponse } from "next/server";
import { ThemeEngine } from "@/lib/branding";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      const theme = ThemeEngine.getDefaultTheme();
      const css = ThemeEngine.generateCSS(theme);
      return new NextResponse(css, { headers: { "Content-Type": "text/css", "Cache-Control": "public, max-age=3600" } });
    }

    const theme = await ThemeEngine.getTheme(orgId);
    const css = ThemeEngine.generateCSS(theme);
    return new NextResponse(css, { headers: { "Content-Type": "text/css", "Cache-Control": "public, max-age=60" } });
  } catch {
    const theme = ThemeEngine.getDefaultTheme();
    const css = ThemeEngine.generateCSS(theme);
    return new NextResponse(css, { headers: { "Content-Type": "text/css" } });
  }
}
