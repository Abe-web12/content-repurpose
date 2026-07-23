import type { VoiceProfile } from "@/lib/types/index";
import type { OutputFormat } from "@/lib/constants/formats";
import type { BrandKitContext } from "@/lib/ai/types";
import { generateStream, generateComplete } from "./provider";
import { buildLinkedInPostPrompt } from "./prompts/linkedin-post";
import { buildTwitterThreadPrompt } from "./prompts/twitter-thread";
import { buildLinkedInCarouselPrompt } from "./prompts/linkedin-carousel";

export function buildPrompt(
  format: OutputFormat,
  content: string,
  voice: VoiceProfile | null,
  brandKit: BrandKitContext | null = null
): string {
  switch (format) {
    case "linkedin_post":
      return buildLinkedInPostPrompt(content, voice, brandKit);
    case "twitter_thread":
      return buildTwitterThreadPrompt(content, voice, brandKit);
    case "linkedin_carousel":
      return buildLinkedInCarouselPrompt(content, voice, brandKit);
    default:
      throw new Error(`Unknown output format: ${format}`);
  }
}

export async function generateContentStream(
  format: OutputFormat,
  analyzedContent: string,
  voice: VoiceProfile | null,
  brandKit: BrandKitContext | null = null
) {
  const prompt = buildPrompt(format, analyzedContent, voice, brandKit);
  return generateStream(prompt);
}

export async function generateContentComplete(
  format: OutputFormat,
  analyzedContent: string,
  voice: VoiceProfile | null,
  brandKit: BrandKitContext | null = null
) {
  const prompt = buildPrompt(format, analyzedContent, voice, brandKit);
  return generateComplete(prompt);
}
