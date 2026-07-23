import { getValidAccessToken, publishToSocial } from "@/lib/social/providers";
import type { ExecutionContext } from "../context";
import type { ExecutionNode } from "../types";
import { FatalError, RetryableError } from "../types";

export interface SocialPublishResult {
  success: boolean;
  postId?: string;
  provider: string;
  content: string;
}

export async function executeSocialPublish(
  node: ExecutionNode,
  context: ExecutionContext,
): Promise<SocialPublishResult> {
  const config = node.config;
  const provider = (config.platform as string) || "linkedin";

  let content = "";

  const lastOutput = getLastOutput(context);
  if (typeof lastOutput === "string") {
    content = lastOutput;
  } else if (lastOutput && typeof lastOutput === "object") {
    const obj = lastOutput as Record<string, unknown>;
    content = (obj.content as string) || (obj.output as string) || (obj.text as string) || "";
  }

  if (config.content) {
    content = context.resolveTemplate(config.content as string);
  }

  if (!content.trim()) {
    throw new FatalError(`No content to publish from node "${node.label}"`, "NO_CONTENT");
  }

  const tokenInfo = await getValidAccessToken(context.userId, provider as "linkedin" | "twitter");
  if (!tokenInfo) {
    throw new FatalError(
      `No valid ${provider} account linked. Please connect your ${provider} account first.`,
      "NO_ACCOUNT",
    );
  }

  try {
    const result = await publishToSocial(
      provider as "linkedin" | "twitter",
      tokenInfo.accessToken,
      content,
    );

    if (!result.success) {
      throw new RetryableError(result.error || `Failed to publish to ${provider}`);
    }

    context.setNodeOutput(node.id, {
      ...result,
      provider,
      content,
    });

    return {
      success: true,
      postId: result.postId,
      provider,
      content,
    };
  } catch (err) {
    if (err instanceof FatalError || err instanceof RetryableError) throw err;
    throw new RetryableError(err instanceof Error ? err.message : `Social publish failed`);
  }
}

function getLastOutput(context: ExecutionContext): unknown {
  let lastValue: unknown = undefined;
  for (const [, output] of context.nodeOutputs) {
    lastValue = output;
  }
  return lastValue;
}
