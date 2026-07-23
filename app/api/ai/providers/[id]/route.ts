import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { AIManager } from "@/lib/ai/provider-manager";
import { ProviderRegistry } from "@/lib/ai/provider-registry";
import { z } from "zod";

export const runtime = "nodejs";

const updateProviderSchema = z.object({
  displayName: z.string().min(1).optional(),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  defaultModel: z.string().optional(),
  models: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  priority: z.number().int().optional(),
  isEnabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { id } = await params;
    const provider = await AIManager.getProvider(id);
    return NextResponse.json({ data: provider });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`ai:providers:${user.id}`, {
      windowMs: 60000,
      maxRequests: 10,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const { id } = await params;
    const body = await parseBody<Record<string, unknown>>(request);
    const validation = updateProviderSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(
        Object.values(validation.error.flatten().fieldErrors).flat()[0] as string || "Invalid input",
        400,
      );
    }

    const existing = await AIManager.getProvider(id);
    const updated = await AIManager.upsertProvider({
      name: existing.name,
      displayName: validation.data.displayName ?? existing.displayName,
      type: existing.type,
      baseUrl: validation.data.baseUrl ?? existing.baseUrl ?? undefined,
      apiKey: validation.data.apiKey ?? existing.apiKey ?? undefined,
      defaultModel: validation.data.defaultModel ?? existing.defaultModel,
      models: validation.data.models ?? existing.models,
      capabilities: validation.data.capabilities ?? existing.capabilities,
      priority: validation.data.priority ?? existing.priority ?? 999,
      isEnabled: validation.data.isEnabled ?? existing.isEnabled,
      config: validation.data.config ?? (existing.config as Record<string, unknown> | undefined),
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`ai:providers:${user.id}`, {
      windowMs: 60000,
      maxRequests: 5,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const { id } = await params;
    const provider = await AIManager.getProvider(id);

    const registry = ProviderRegistry.getInstance();
    const registered = registry.getAll().find(p => p.name === provider.name);
    if (registered) {
      const { prisma } = await import("@/lib/prisma");
      await prisma.aiProviders.update({ where: { id }, data: { isEnabled: false } });
    }

    await AIManager.trackEvent(id, "provider_disabled", `Provider ${provider.name} disabled by ${user.id}`);

    return NextResponse.json({ data: { id, disabled: true } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
