import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { ragQuerySchema } from "@/lib/validations/rag";
import { retrieveChunks, buildContext, buildRAGPrompt, extractCitations } from "@/lib/studio/rag-engine";

export const runtime = "nodejs";

function generateMockEmbedding(dimensions = 1536): number[] {
  return Array.from({ length: dimensions }, () => Math.random() * 2 - 1);
}

const PROVIDER_CONFIG: Record<string, { keyEnv: string; baseUrl: string; defaultModel: string }> = {
  openai: { keyEnv: "OPENAI_API_KEY", baseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4" },
  anthropic: { keyEnv: "ANTHROPIC_API_KEY", baseUrl: "https://api.anthropic.com/v1", defaultModel: "claude-3-opus-20240229" },
  gemini: { keyEnv: "GEMINI_API_KEY", baseUrl: "https://generativelanguage.googleapis.com/v1beta", defaultModel: "gemini-1.5-flash" },
  morphllm: { keyEnv: "AI_API_KEY", baseUrl: "https://api.morphllm.com/v1", defaultModel: "gpt-4o-mini" },
  groq: { keyEnv: "GROQ_API_KEY", baseUrl: "https://api.groq.com/openai/v1", defaultModel: "llama3-70b-8192" },
  mistral: { keyEnv: "MISTRAL_API_KEY", baseUrl: "https://api.mistral.ai/v1", defaultModel: "mistral-large-latest" },
  deepseek: { keyEnv: "DEEPSEEK_API_KEY", baseUrl: "https://api.deepseek.com/v1", defaultModel: "deepseek-chat" },
  openrouter: { keyEnv: "OPENROUTER_API_KEY", baseUrl: "https://openrouter.ai/api/v1", defaultModel: "openai/gpt-4o" },
};

async function callAIProvider(
  provider: string,
  model: string,
  messages: { role: string; content: string }[],
  systemPrompt: string | null | undefined,
  temperature: number,
  maxTokens: number | undefined,
): Promise<{ content: string; promptTokens: number; completionTokens: number }> {
  const config = PROVIDER_CONFIG[provider];
  if (!config) throw new AppError(`Unsupported provider: ${provider}`, 400);

  const apiKey = process.env[config.keyEnv];
  if (!apiKey) throw new AppError(`Missing API key for provider: ${provider}`, 500);

  const modelToUse = model || config.defaultModel;

  if (provider === "anthropic") {
    const body: Record<string, unknown> = {
      model: modelToUse,
      messages: messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      max_tokens: maxTokens ?? 1024,
      temperature,
    };
    if (systemPrompt) body.system = systemPrompt;

    const res = await fetch(`${config.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new AppError(`Anthropic API error: ${errText}`, res.status);
    }

    const data = await res.json();
    const content = data.content?.map((c: { text: string }) => c.text).join("") ?? "";
    return {
      content,
      promptTokens: (data.usage?.input_tokens ?? 0) as number,
      completionTokens: (data.usage?.output_tokens ?? 0) as number,
    };
  }

  if (provider === "gemini") {
    const body = {
      contents: [{ parts: messages.map((m) => ({ text: m.content })) }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens ?? 1024,
      },
    };
    if (systemPrompt) {
      (body.contents as { parts: { text: string }[] }[]).unshift({
        parts: [{ text: `System: ${systemPrompt}` }],
      });
    }

    const res = await fetch(`${config.baseUrl}/models/${modelToUse}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new AppError(`Gemini API error: ${errText}`, res.status);
    }

    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.map((p: { text: string }) => p.text).join("") ?? "";
    return {
      content,
      promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }

  const messagesPayload: { role: "user" | "system"; content: string }[] = [];
  if (systemPrompt) {
    messagesPayload.push({ role: "system", content: systemPrompt });
  }
  for (const msg of messages) {
    messagesPayload.push({ role: msg.role as "user" | "system", content: msg.content });
  }

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelToUse,
      messages: messagesPayload,
      temperature,
      max_tokens: maxTokens ?? 1024,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new AppError(`Provider API error (${provider}): ${errText}`, res.status);
  }

  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 20 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = ragQuerySchema.parse(body);

    const startTime = Date.now();

    const queryEmbedding = generateMockEmbedding();
    const chunks = await retrieveChunks(queryEmbedding, {
      topK: parsed.topK,
      minScore: parsed.minScore,
      knowledgeBaseIds: parsed.knowledgeBaseIds,
    });

    const context = buildContext(chunks);
    const prompt = buildRAGPrompt(parsed.query, context, parsed.systemPrompt);

    const messages = [{ role: "user", content: prompt.user }];
    const result = await callAIProvider(
      parsed.provider,
      parsed.model,
      messages,
      prompt.system,
      parsed.temperature ?? 0.7,
      parsed.maxTokens,
    );

    const latency = Date.now() - startTime;

    const citations = parsed.includeCitations ? extractCitations(result.content, chunks) : [];

    return NextResponse.json({
      data: {
        answer: result.content,
        citations,
        usage: {
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          totalTokens: result.promptTokens + result.completionTokens,
        },
        latency,
      },
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
