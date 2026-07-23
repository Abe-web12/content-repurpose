import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { comparePromptSchema } from "@/lib/validations/prompt";

export const runtime = "nodejs";

const API_ENDPOINTS: Record<string, { url: string; keyEnv: string; style: "openai" | "anthropic" | "gemini" }> = {
  openai: { url: "https://api.openai.com/v1/chat/completions", keyEnv: "OPENAI_API_KEY", style: "openai" },
  anthropic: { url: "https://api.anthropic.com/v1/messages", keyEnv: "ANTHROPIC_API_KEY", style: "anthropic" },
  gemini: { url: "", keyEnv: "GEMINI_API_KEY", style: "gemini" },
  morphllm: { url: "https://api.morphllm.com/v1/chat/completions", keyEnv: "AI_API_KEY", style: "openai" },
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", keyEnv: "GROQ_API_KEY", style: "openai" },
  mistral: { url: "https://api.mistral.ai/v1/chat/completions", keyEnv: "MISTRAL_API_KEY", style: "openai" },
  deepseek: { url: "https://api.deepseek.com/v1/chat/completions", keyEnv: "DEEPSEEK_API_KEY", style: "openai" },
  openrouter: { url: "https://openrouter.ai/api/v1/chat/completions", keyEnv: "OPENROUTER_API_KEY", style: "openai" },
};

function callProvider(
  provider: string,
  model: string,
  systemPrompt: string | null | undefined,
  userPrompt: string,
  temperature: number,
  maxTokens: number,
  topP: number,
): Promise<{ output: string; promptTokens: number; completionTokens: number; latency: number }> {
  const endpoint = API_ENDPOINTS[provider];
  if (!endpoint) throw new AppError(`Unsupported provider: ${provider}`, 400);

  const apiKey = process.env[endpoint.keyEnv];
  if (!apiKey) throw new AppError(`Missing API key for provider: ${provider}`, 500);

  const startTime = Date.now();

  if (endpoint.style === "anthropic") {
    const messages: { role: string; content: string }[] = [{ role: "user", content: userPrompt }];
    return fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt ?? undefined,
        messages,
      }),
    }).then(async (res) => {
      const json = await res.json();
      if (!res.ok) throw new AppError(json.error?.message ?? "Anthropic API error", res.status);
      const latency = Date.now() - startTime;
      return {
        output: json.content?.map((c: { text: string }) => c.text).join("") ?? "",
        promptTokens: json.usage?.input_tokens ?? 0,
        completionTokens: json.usage?.output_tokens ?? 0,
        latency,
      };
    });
  }

  if (endpoint.style === "gemini") {
    const contents = [];
    if (systemPrompt) {
      contents.push({ role: "user", parts: [{ text: systemPrompt }] });
    }
    contents.push({ role: "user", parts: [{ text: userPrompt }] });
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature, topP, maxOutputTokens: maxTokens },
      }),
    }).then(async (res) => {
      const json = await res.json();
      if (!res.ok) throw new AppError(json.error?.message ?? "Gemini API error", res.status);
      const latency = Date.now() - startTime;
      const parts = json.candidates?.[0]?.content?.parts ?? [];
      return {
        output: parts.map((p: { text: string }) => p.text).join("") ?? "",
        promptTokens: json.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
        latency,
      };
    });
  }

  const messages: { role: string; content: string }[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  }

  return fetch(endpoint.url, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, top_p: topP }),
  }).then(async (res) => {
    const json = await res.json();
    if (!res.ok) throw new AppError(json.error?.message ?? `${provider} API error`, res.status);
    const latency = Date.now() - startTime;
    return {
      output: json.choices?.[0]?.message?.content ?? "",
      promptTokens: json.usage?.prompt_tokens ?? 0,
      completionTokens: json.usage?.completion_tokens ?? 0,
      latency,
    };
  });
}

function estimateCost(
  provider: string,
  _model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const rates: Record<string, { input: number; output: number }> = {
    openai: { input: 0.00001, output: 0.00003 },
    anthropic: { input: 0.000015, output: 0.000075 },
    gemini: { input: 0.0000025, output: 0.00001 },
    morphllm: { input: 0.000005, output: 0.000015 },
    groq: { input: 0.000007, output: 0.000025 },
    mistral: { input: 0.000003, output: 0.00001 },
    deepseek: { input: 0.000001, output: 0.000002 },
    openrouter: { input: 0.00001, output: 0.00003 },
  };
  const rate = rates[provider] ?? rates.openai;
  return (promptTokens / 1000) * rate.input + (completionTokens / 1000) * rate.output;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const member = await prisma.organizationMembers.findFirst({
      where: { userId: user.id },
    });
    if (!member) throw new AppError("No organization found", 404);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = comparePromptSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(validation.error.errors.map((e) => e.message).join(", "), 400);
    }

    const results = await Promise.allSettled(
      validation.data.runs.map(async (run) => {
        const resolvedPrompt = run.variables
          ? run.userPrompt.replace(/\{\{(\w+)\}\}/g, (_, key) => run.variables![key] ?? "")
          : run.userPrompt;

        const result = await callProvider(
          run.provider,
          run.model,
          run.systemPrompt,
          resolvedPrompt,
          run.temperature,
          run.maxTokens,
          run.topP,
        );

        const totalTokens = result.promptTokens + result.completionTokens;
        const cost = estimateCost(run.provider, run.model, result.promptTokens, result.completionTokens);

        return {
          provider: run.provider,
          model: run.model,
          output: result.output,
          latency: result.latency,
          tokens: { prompt: result.promptTokens, completion: result.completionTokens, total: totalTokens },
          cost,
        };
      }),
    );

    const data = results.map((r) =>
      r.status === "fulfilled"
        ? r.value
        : { provider: "unknown", model: "unknown", output: "", latency: 0, tokens: { prompt: 0, completion: 0, total: 0 }, cost: 0, error: r.reason instanceof Error ? r.reason.message : "Unknown error" },
    );

    return NextResponse.json({ data });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
