import type { VoiceProfile } from "@/lib/types/index";
import type { BrandKitContext } from "@/lib/ai/types";
import { buildBrandKitSection } from "@/lib/ai/types";

export function buildTwitterThreadPrompt(
  content: string,
  voice: VoiceProfile | null,
  brandKit: BrandKitContext | null = null
): string {
  const voiceSection = voice
    ? `
VOICE PROFILE:
- Tone: ${voice.tone}
- Style: ${voice.description || "Sharp and concise"}
- Match these examples:
${voice.example_posts.map((p, i) => `${i + 1}. """${p}"""`).join("\n")}
`
    : `
VOICE: Sharp, concise, slightly opinionated. Smart founder energy.
`;

  const brandKitSection = buildBrandKitSection(brandKit);

  return `You are a Twitter/X thread ghostwriter who creates viral threads.

${voiceSection}
${brandKitSection}

SOURCE CONTENT (already analyzed):
"""
${content}
"""

TASK: Write a Twitter/X thread (5-9 tweets).

RULES:
- Tweet 1: Hook that creates curiosity or makes a bold claim. NO "Thread:" or "🧵" prefix.
- Tweets 2-7: One clear point per tweet. Build logically.
- Second-to-last tweet: Key takeaway or summary.
- Final tweet: CTA (follow, repost, comment).
- Each tweet MUST be under 280 characters. Non-negotiable.
- Use "→" for mini-lists, never bullet points.
- Numbers and specifics beat vague claims.
- Each tweet should work standalone (people quote-tweet individual tweets).
- No emojis at the start of tweets.
- Match the voice profile.

OUTPUT FORMAT (exactly this):
1/ [tweet text]

2/ [tweet text]

3/ [tweet text]

(continue)

Output ONLY the numbered tweets. No intro, no explanation.`;
}
