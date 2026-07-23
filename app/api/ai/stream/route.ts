export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { AppError } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { CreditManager } from "@/lib/billing/credits";
import { ProviderRegistry } from "@/lib/ai/provider-registry";
import { bootstrapProviders } from "@/lib/ai/bootstrap";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const streamSchema = z.object({
  prompt: z.string().min(1).max(50000),
  contentType: z.string().optional(),
  platform: z.string().optional(),
  tone: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(32000).optional(),
  forceProvider: z.string().optional(),
});

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = await rateLimit(`ai:stream:${userId}`, { windowMs: 60_000, maxRequests: 20 });
    if (!rl.success) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "content-type": "application/json" },
      });
    }

    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON", 400);
    });
    const opts = streamSchema.parse(body);

    bootstrapProviders();
    const registry = ProviderRegistry.getInstance();

    let providerName = opts.forceProvider;
    if (providerName && !registry.has(providerName)) {
      return new Response(JSON.stringify({ error: `Provider "${providerName}" not available` }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const streamingProviders = registry.getAll().filter((p) => {
      if (providerName && p.name !== providerName) return false;
      return p.capabilities.includes("stream") && typeof p.stream === "function";
    });

    if (streamingProviders.length === 0) {
      return new Response(JSON.stringify({ error: "No streaming providers available" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    }

    const provider = streamingProviders[0];

    const creditCheck = await CreditManager.checkAndDeduct(userId, 1, `stream:${userId}:${Date.now()}`);
    if (!creditCheck.success) {
      return new Response(JSON.stringify({ error: creditCheck.error }), {
        status: 402,
        headers: { "content-type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(sseEvent("meta", { model: "", provider: provider.name })));

        let fullContent = "";
        const startTime = Date.now();

        try {
          const gen = provider.stream!({
            messages: [{ role: "user", content: opts.prompt }],
            temperature: opts.temperature ?? 0.7,
            maxTokens: opts.maxTokens,
          });

          for await (const chunk of gen) {
            if (chunk.done) break;
            fullContent += chunk.content;
            controller.enqueue(encoder.encode(sseEvent("chunk", { text: chunk.content })));
          }

          const latency = Date.now() - startTime;

          const result = await prisma.$transaction(async (tx) => {
            const generation = await tx.generations.create({
              data: {
                userId,
                content: fullContent,
                inputType: "raw_text",
                inputContent: opts.prompt.slice(0, 500),
                extractedContent: opts.prompt,
                outputFormat: opts.contentType || "auto",
                outputContent: fullContent,
                modelUsed: provider.name,
                isFavorite: false,
              },
              select: { id: true },
            });

            await tx.usageLog.create({
              data: {
                userId,
                generationId: generation.id,
                action: "generation",
                creditsConsumed: 1,
              },
            });

            return generation;
          });

          controller.enqueue(encoder.encode(sseEvent("done", {
            model: provider.name,
            provider: provider.name,
            latency,
            tokensUsed: Math.ceil(fullContent.length / 4),
            generationId: result.id,
          })));
        } catch (err) {
          // Refund credit on failure — credit was already deducted before stream
          try {
            await CreditManager.addCredits(userId, 1, "REFUND", {
              reference: `stream-refund:${userId}:${Date.now()}`,
              description: "Refund for failed stream generation",
            });
          } catch {}

          const message = err instanceof Error ? err.message : "Generation failed";
          controller.enqueue(encoder.encode(sseEvent("error", { message })));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-store",
        "connection": "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof AppError ? err.message : "Internal server error";
    const status = err instanceof AppError ? err.statusCode : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "content-type": "application/json" },
    });
  }
}
