import type { VoiceProfile } from "@/lib/types/index";
import type { BrandKitContext } from "@/lib/ai/types";
import { buildBrandKitSection } from "@/lib/ai/types";

export function buildLinkedInPostPrompt(
  content: string,
  voice: VoiceProfile | null,
  brandKit: BrandKitContext | null = null
): string {
  const voiceSection = voice
    ? `
VOICE PROFILE:
- Tone: ${voice.tone}
- Style: ${voice.description || "Professional and engaging"}
- Match these writing examples closely:
${voice.example_posts.map((p, i) => `Example ${i + 1}:\n"""${p}"""`).join("\n\n")}
`
    : `
VOICE: Professional, engaging, conversational. Like a smart founder sharing genuine insights.
`;

  const brandKitSection = buildBrandKitSection(brandKit);

  return `You are an expert LinkedIn ghostwriter.

${voiceSection}
${brandKitSection}

SOURCE CONTENT (already analyzed):
"""
${content}
"""

TASK: Write ONE LinkedIn post (150-300 words).

RULES:
1. First line = scroll-stopping hook. Provocative, surprising, or contrarian. This shows before "see more" so it MUST compel a click.
2. Empty line after the hook.
3. Body: 4-8 short paragraphs, 1-2 sentences each.
4. Single line breaks between paragraphs.
5. End with a question OR clear call-to-action.
6. Extract ONE key insight from the source, don't try to cover everything.
7. NO hashtags unless the voice examples use them.
8. NO emojis unless the voice examples use them.
9. NO "Here's the thing:" or "Let me tell you:" or any AI cliches.
10. Do NOT start with "I" (overdone).
11. Write AS the person, not FOR them.
12. Sound human. Use contractions. Be specific not generic.

OUTPUT: The post text only. No labels, no "Here's your post:", no explanation. Just the post ready to paste into LinkedIn.`;
}
