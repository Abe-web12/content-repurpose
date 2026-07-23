import type { VoiceProfile } from "@/lib/types/index";
import type { BrandKitContext } from "@/lib/ai/types";
import { buildBrandKitSection } from "@/lib/ai/types";

export function buildLinkedInCarouselPrompt(
  content: string,
  voice: VoiceProfile | null,
  brandKit: BrandKitContext | null = null
): string {
  const voiceSection = voice
    ? `
VOICE: ${voice.tone}. ${voice.description || "Clear and authoritative."}
`
    : `
VOICE: Clear, authoritative, educational.
`;

  const brandKitSection = buildBrandKitSection(brandKit);

  return `You are a LinkedIn carousel content strategist.

${voiceSection}
${brandKitSection}

SOURCE CONTENT (already analyzed):
"""
${content}
"""

TASK: Write content for an 8-10 slide LinkedIn carousel.

STRUCTURE:
- Slide 1: HOOK. Bold title (5-8 words) that stops scrolling. Optional 1-line subtitle.
- Slide 2: Context or problem statement (why this matters).
- Slides 3-8: One key insight, tip, or step per slide.
- Slide 9: Summary or "Key Takeaways" slide.
- Slide 10: CTA (follow, save, comment).

PER SLIDE RULES:
- Headline: 3-7 words, bold and clear.
- Body: 1-3 short sentences OR a mini-list. Max 25 words per slide.
- Each slide delivers value independently.
- Simple, punchy language.
- No filler ("In conclusion," "Let's dive in," etc.)

OUTPUT FORMAT:

[Slide 1]
Headline: [hook title]
Body: [optional subtitle]

[Slide 2]
Headline: [section title]
Body: [content]

(continue for all slides)

Output ONLY the slides. No intro, no explanation.`;
}
