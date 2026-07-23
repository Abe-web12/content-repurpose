import { generateWithFallback } from "./unified-provider";

export interface ModerationResult {
  passed: boolean;
  categories: string[];
  score: number;
  reason?: string;
}

const BLOCKED_PATTERNS = [
  /bypass.*(?:ai|moderat|filter)/i,
  /ignore.*(?:previous|above|below).*instruction/i,
  /role.?play/i,
  /malware|virus|exploit/i,
  /generate.*(?:illegal|unlawful|bomb|weapon)/i,
];

export async function moderateContent(content: string): Promise<ModerationResult> {
  const detectedCategories: string[] = [];

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      detectedCategories.push("prompt_injection");
      break;
    }
  }

  if (content.length > 50000) {
    detectedCategories.push("content_too_long");
  }

  if (detectedCategories.length > 0) {
    return {
      passed: false,
      categories: detectedCategories,
      score: 1.0,
      reason: `Blocked by pattern: ${detectedCategories.join(", ")}`,
    };
  }

  try {
    const result = await generateWithFallback(
      `You are a content moderation system. Analyze the following text and classify it into these categories if applicable: illegal_content, spam, malware, harassment, hate_speech, self_harm, violence, sexual_content, prompt_injection.

      Return a JSON object with:
      - "flagged": boolean (true if content violates any policy)
      - "categories": string[] (list of violated categories)
      - "score": number (0-1 confidence)
      - "reason": string (explanation if flagged)

      Text to analyze:
      ---
      ${content.slice(0, 4000)}
      ---`,
      {
        temperature: 0,
        maxTokens: 500,
        timeout: 10000,
      },
    );

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        passed: !parsed.flagged,
        categories: parsed.categories || [],
        score: parsed.score || 0,
        reason: parsed.reason,
      };
    }
  } catch {
    // AI moderation unavailable, allow through
  }

  return { passed: true, categories: [], score: 0 };
}
