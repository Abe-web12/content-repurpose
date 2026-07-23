export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { createClient } from "@/lib/supabase/server";
import { IntegrationManager } from "@/lib/integrations/manager";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const categories = await IntegrationManager.getCategories();
    return NextResponse.json({ data: categories });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
