import { generateWithFallback } from "@/lib/ai/unified-provider";
import type { ExecutionContext } from "../context";
import type { ExecutionNode } from "../types";
import { RetryableError, ExecutionError } from "../types";

export interface AiNodeResult {
  content: string;
  model: string;
  provider: string;
}

function buildAiPrompt(node: ExecutionNode, context: ExecutionContext): string {
  const config = node.config;
  const inputContent = context.getNodeOutput(context.nodeOutputs.size > 0 ? node.id : "") as string | undefined;
  const previousOutput = getPreviousNodeOutput(node.id, context);

  const content = previousOutput ?? inputContent ?? "";

  switch (node.type) {
    case "AI_GENERATE": {
      const format = (config.format as string) || "linkedin_post";
      return `Generate ${format} content based on the following:\n\n${content}`;
    }
    case "AI_REWRITE": {
      const tone = (config.tone as string) || "professional";
      return `Rewrite the following content in a ${tone} tone:\n\n${content}`;
    }
    case "AI_SUMMARIZE": {
      const length = (config.length as string) || "short";
      return `Provide a ${length} summary of the following content:\n\n${content}`;
    }
    case "AI_TRANSLATE": {
      const targetLanguage = (config.targetLanguage as string) || "Spanish";
      return `Translate the following content to ${targetLanguage}:\n\n${content}`;
    }
    case "AI_EXPAND": {
      const targetLength = (config.targetLength as string) || "medium";
      return `Expand the following content into a ${targetLength}-length piece:\n\n${content}`;
    }
    case "AI_SHORTEN": {
      const target = (config.targetLength as string) || "short";
      return `Shorten the following content to a ${target} version:\n\n${content}`;
    }
    case "AI_OPTIMIZE": {
      const keywords = (config.keywords as string[]) || [];
      const kwStr = keywords.length > 0 ? `Target keywords: ${keywords.join(", ")}.` : "";
      return `Optimize the following content for SEO. ${kwStr}\n\n${content}`;
    }
    case "AI_TONE_CONVERT": {
      const targetTone = (config.targetTone as string) || "professional";
      return `Convert the tone of the following content to ${targetTone}:\n\n${content}`;
    }
    default:
      return content;
  }
}

function getPreviousNodeOutput(currentNodeId: string, context: ExecutionContext): string | undefined {
  for (const [nodeId, output] of context.nodeOutputs) {
    if (nodeId !== currentNodeId && typeof output === "string") {
      return output;
    }
    if (nodeId !== currentNodeId && typeof output === "object" && output !== null) {
      const obj = output as Record<string, unknown>;
      if (typeof obj.content === "string") return obj.content;
      if (typeof obj.text === "string") return obj.text;
      if (typeof obj.output === "string") return obj.output;
    }
  }
  return undefined;
}

export async function executeAiNode(
  node: ExecutionNode,
  context: ExecutionContext,
): Promise<AiNodeResult> {
  const prompt = buildAiPrompt(node, context);
  if (!prompt.trim()) {
    throw new ExecutionError(`No input content available for node "${node.label}"`, "NO_INPUT", false);
  }

  try {
    const result = await generateWithFallback(prompt, {
      temperature: (node.config.temperature as number) ?? 0.7,
      maxTokens: (node.config.maxTokens as number) ?? 2048,
      timeout: (node.config.timeout as number) ?? 60000,
      retries: 1,
    });

    if (!result.content) {
      throw new RetryableError("AI returned empty content");
    }

    context.setNodeOutput(node.id, result.content);
    return result;
  } catch (err) {
    if (err instanceof ExecutionError) throw err;
    throw new RetryableError(err instanceof Error ? err.message : "AI execution failed");
  }
}
