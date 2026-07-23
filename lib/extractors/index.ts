import type { InputType } from "@/lib/constants/formats";
import { extractYouTube } from "./youtube";
import { extractBlog } from "./blog";
import { extractPodcast } from "./podcast";
import { isYouTubeUrl, isPodcastUrl } from "@/lib/utils";

export interface ExtractionResult {
  title: string;
  content: string;
  sourceType: string;
  wordCount: number;
}

export function detectInputType(input: string): InputType {
  const trimmed = input.trim();

  if (isYouTubeUrl(trimmed)) return "youtube_url";
  if (isPodcastUrl(trimmed)) return "podcast_url";

  try {
    new URL(trimmed);
    return "blog_url";
  } catch {
    return "raw_text";
  }
}

export async function extractContent(
  input: string,
  inputType: InputType
): Promise<ExtractionResult> {
  switch (inputType) {
    case "youtube_url":
      return extractYouTube(input.trim());

    case "blog_url":
      return extractBlog(input.trim());

    case "podcast_url":
      return extractPodcast(input.trim());

    case "raw_text": {
      const text = input.trim();
      const wordCount = text.split(/\s+/).filter(Boolean).length;

      if (wordCount < 50) {
        throw new Error("Please provide at least 50 words of content to repurpose.");
      }

      return {
        title: text.slice(0, 60) + (text.length > 60 ? "..." : ""),
        content: text.slice(0, 15000),
        sourceType: "text",
        wordCount,
      };
    }

    default:
      throw new Error(`Unsupported input type: ${inputType}`);
  }
}
