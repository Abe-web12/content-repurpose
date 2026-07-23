import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { runPromptSchema } from "@/lib/validations/prompt";
import { rateLimitByUser } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

function resolveVariables(template: string, variables?: Record<string, string>): string {
  if (!variables) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? "");
}

function estimateCost(provider: string, model: string, promptTokens: number, completionTokens: number): number {
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

async function callProvider(
  provider: string,
  model: string,
  systemPrompt: string | null | undefined,
  userPrompt: string,
  temperature: number,
  maxTokens: number,
  topP: number,
): Promise<{ output: string; promptTokens: number; completionTokens: number; latency: number }> {
  const startTime = Date.now();
  const messages: { role: string; content: string }[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: userPrompt });

  let output = "";
  let promptTokens = 0;
  let completionTokens = 0;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  switch (provider) {
    case "openai": {
      headers.Authorization = `Bearer ${process.env.OPENAI_API_KEY}`;
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, top_p: topP }),
      });
      const json = await res.json();
      if (!res.ok) throw new AppError(json.error?.message ?? "OpenAI API error", res.status);
      output = json.choices?.[0]?.message?.content ?? "";
      promptTokens = json.usage?.prompt_tokens ?? 0;
      completionTokens = json.usage?.completion_tokens ?? 0;
      break;
    }
    case "anthropic": {
      headers["x-api-key"] = process.env.ANTHROPIC_API_KEY ?? "";
      headers["anthropic-version"] = "2023-06-01";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt ?? undefined,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new AppError(json.error?.message ?? "Anthropic API error", res.status);
      output = json.content?.map((c: { text: string }) => c.text).join("") ?? "";
      promptTokens = json.usage?.input_tokens ?? 0;
      completionTokens = json.usage?.output_tokens ?? 0;
      break;
    }
    case "gemini": {
      const contents = [];
      if (systemPrompt) {
        contents.push({ role: "user", parts: [{ text: systemPrompt }] });
      }
      contents.push({ role: "user", parts: [{ text: userPrompt }] });
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            contents,
            generationConfig: { temperature, topP, maxOutputTokens: maxTokens },
          }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new AppError(json.error?.message ?? "Gemini API error", res.status);
      output = json.candidates?.[0]?.content?.parts?.map((p: { text: string }) => p.text).join("") ?? "";
      promptTokens = json.usageMetadata?.promptTokenCount ?? 0;
      completionTokens = json.usageMetadata?.candidatesTokenCount ?? 0;
      break;
    }
    case "morphllm": {
      headers.Authorization = `Bearer ${process.env.AI_API_KEY}`;
      headers["X-Provider"] = "morphllm";
      const res = await fetch("https://api.morphllm.com/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, top_p: topP }),
      });
      const json = await res.json();
      if (!res.ok) throw new AppError(json.error?.message ?? "MorphLLM API error", res.status);
      output = json.choices?.[0]?.message?.content ?? "";
      promptTokens = json.usage?.prompt_tokens ?? 0;
      completionTokens = json.usage?.completion_tokens ?? 0;
      break;
    }
    case "groq": {
      headers.Authorization = `Bearer ${process.env.GROQ_API_KEY}`;
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, top_p: topP }),
      });
      const json = await res.json();
      if (!res.ok) throw new AppError(json.error?.message ?? "Groq API error", res.status);
      output = json.choices?.[0]?.message?.content ?? "";
      promptTokens = json.usage?.prompt_tokens ?? 0;
      completionTokens = json.usage?.completion_tokens ?? 0;
      break;
    }
    case "mistral": {
      headers.Authorization = `Bearer ${process.env.MISTRAL_API_KEY}`;
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, top_p: topP }),
      });
      const json = await res.json();
      if (!res.ok) throw new AppError(json.error?.message ?? "Mistral API error", res.status);
      output = json.choices?.[0]?.message?.content ?? "";
      promptTokens = json.usage?.prompt_tokens ?? 0;
      completionTokens = json.usage?.completion_tokens ?? 0;
      break;
    }
    case "deepseek": {
      headers.Authorization = `Bearer ${process.env.DEEPSEEK_API_KEY}`;
      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, top_p: topP }),
      });
      const json = await res.json();
      if (!res.ok) throw new AppError(json.error?.message ?? "DeepSeek API error", res.status);
      output = json.choices?.[0]?.message?.content ?? "";
      promptTokens = json.usage?.prompt_tokens ?? 0;
      completionTokens = json.usage?.completion_tokens ?? 0;
      break;
    }
    case "openrouter": {
      headers.Authorization = `Bearer ${process.env.OPENROUTER_API_KEY}`;
      headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, top_p: topP }),
      });
      const json = await res.json();
      if (!res.ok) throw new AppError(json.error?.message ?? "OpenRouter API error", res.status);
      output = json.choices?.[0]?.message?.content ?? "";
      promptTokens = json.usage?.prompt_tokens ?? 0;
      completionTokens = json.usage?.completion_tokens ?? 0;
      break;
    }
    default:
      throw new AppError(`Unsupported provider: ${provider}`, 400);
  }

  const latency = Date.now() - startTime;
  return { output, promptTokens, completionTokens, latency };
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

    const rateLimitResult = await rateLimitByUser(user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 },
      );
    }

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = runPromptSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(validation.error.errors.map((e) => e.message).join(", "), 400);
    }

    const { provider, model, temperature, topP, maxTokens, systemPrompt, userPrompt, variables } = validation.data;

    let targetPromptId: string;
    let targetPromptVersion = 1;

    const rawPromptId = typeof body.promptId === "string" ? body.promptId : undefined;
    if (rawPromptId) {
      const prompt = await prisma.promptTemplates.findFirst({
        where: { id: rawPromptId, organizationId: member.organizationId, deletedAt: null },
      });
      if (!prompt) throw new AppError("Prompt not found", 404);
      targetPromptId = prompt.id;
      targetPromptVersion = prompt.version;
    } else {
      const quickPrompt = await prisma.promptTemplates.create({
        data: {
          name: `Quick Run - ${new Date().toISOString().slice(0, 16)}`,
          content: userPrompt,
          organizationId: member.organizationId,
          userId: user.id,
          tags: [],
        },
      });
      targetPromptId = quickPrompt.id;
    }

    const resolvedPrompt = resolveVariables(userPrompt, variables);

    const result = await callProvider(provider, model, systemPrompt, resolvedPrompt, temperature, maxTokens, topP);

    const totalTokens = result.promptTokens + result.completionTokens;
    const estimatedCost = estimateCost(provider, model, result.promptTokens, result.completionTokens);

    const execution = await prisma.promptExecutions.create({
      data: {
        promptId: targetPromptId,
        promptVersion: targetPromptVersion,
        provider,
        model,
        temperature,
        topP,
        maxTokens,
        systemPrompt: systemPrompt ?? null,
        userPrompt: resolvedPrompt,
        output: result.output,
        latency: result.latency,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens,
        estimatedCost,
        success: true,
        userId: user.id,
        organizationId: member.organizationId,
      },
    });

    return NextResponse.json({ data: execution });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
