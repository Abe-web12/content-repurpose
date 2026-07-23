import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export interface ResolvedPrompt {
  content: string;
  variables: Record<string, string>;
}

export function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

export function resolvePrompt(content: string, variables: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function validateSyntax(content: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const openBraces = content.match(/\{\{/g)?.length ?? 0;
  const closeBraces = content.match(/\}\}/g)?.length ?? 0;
  if (openBraces !== closeBraces) {
    errors.push(`Mismatched braces: ${openBraces} opening, ${closeBraces} closing`);
  }
  const vars = extractVariables(content);
  for (const v of vars) {
    if (!/^[a-zA-Z_]\w*$/.test(v)) {
      errors.push(`Invalid variable name: ${v}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export async function cachePromptExecution(promptId: string, key: string, data: unknown, ttl = 3600): Promise<void> {
  await redis.set(`prompt:${promptId}:exec:${key}`, JSON.stringify(data), { ex: ttl });
}

export async function getCachedExecution(promptId: string, key: string): Promise<unknown | null> {
  const cached = await redis.get(`prompt:${promptId}:exec:${key}`);
  if (!cached) return null;
  try { return JSON.parse(cached as string); } catch { return null; }
}

export function buildSearchQuery(search?: string, tags?: string[], categoryId?: string) {
  const where: Record<string, unknown> = { deletedAt: null };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }
  if (tags && tags.length > 0) {
    where.tags = { hasSome: tags };
  }
  if (categoryId) {
    where.categoryId = categoryId;
  }
  return where;
}
