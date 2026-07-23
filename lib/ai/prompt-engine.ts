import type { GeminiExtraction } from "./gemini-provider";
import type { BrandKit, VoiceProfile } from "@/lib/types/index";
import type { OutputFormat } from "@/lib/constants/formats";
import type { Tone } from "@/hooks/use-generate";

export interface PromptEngineInput {
  extraction: GeminiExtraction;
  brandKit: BrandKit | null;
  voiceProfile: VoiceProfile | null;
  tone: Tone;
  audience: string;
  format: OutputFormat;
}

const TONE_MAP: Record<Tone, string> = {
  thought_leader:
    "Authoritative and forward-thinking. Position the author as a seasoned expert who challenges conventional wisdom. Use strong, confident language and share original perspectives. Be provocative but well-reasoned.",
  direct:
    "Clear, concise, and no-fluff. Get straight to the point. Use simple, direct language. Every sentence must add value. Avoid marketing superlatives or vague claims.",
  casual:
    "Conversational and friendly. Write as if explaining to a colleague over coffee. Use contractions, occasional humor, and relatable language. Authentic over polished.",
};

const FORMAT_RULES: Record<OutputFormat, string> = {
  linkedin_post: `FORMAT: LinkedIn Post

STRUCTURE:
1. Hook (first 1-2 lines) — scroll-stopping, provocative, or curiosity-driven. This shows before "see more" so it must compel a click.
2. Empty line after the hook.
3. Body: 4-8 short paragraphs, 1-2 sentences each. Single line breaks between paragraphs.
4. End with a question or clear call-to-action.

RULES:
- 150-300 words.
- Extract ONE key insight from the source; don't try to cover everything.
- No headlines ("Here's the thing:", "Let me tell you:") or AI cliches.
- Do not start most sentences with "I".
- Sound human. Use contractions. Be specific, not generic.
- Use numbers and specifics over vague claims.
- NO hashtags and NO emojis unless the voice profile explicitly uses them.
- Output ONLY the post text. No labels, no "Here's your post:", no explanation.`,

  linkedin_carousel: `FORMAT: LinkedIn Carousel

STRUCTURE:
- Slide 1: HOOK. Bold title (5-8 words) that stops scrolling. Optional 1-line subtitle.
- Slide 2: Context or problem statement (why this matters).
- Slides 3-8: One key insight, tip, or step per slide.
- Slide 9: Summary or "Key Takeaways" slide.
- Slide 10: CTA (follow, save, comment).

PER SLIDE RULES:
- Headline: 3-7 words, bold and clear.
- Body: 1-3 short sentences or a mini-list. Max 25 words per slide.
- Each slide delivers value independently.
- Simple, punchy language.
- No filler ("In conclusion,", "Let's dive in," etc.)

OUTPUT FORMAT:
[Slide 1]
Headline: [hook title]
Body: [optional subtitle]

[Slide 2]
Headline: [section title]
Body: [content]

(continue for all slides)

Output ONLY the slides. No intro, no explanation.`,

  twitter_thread: `FORMAT: Twitter/X Thread

RULES:
- 5-9 tweets total.
- Tweet 1: Hook that creates curiosity or makes a bold claim. NO "Thread:" or "🧵" prefix.
- Tweets 2-7: One clear point per tweet. Build logically.
- Second-to-last tweet: Key takeaway or summary.
- Final tweet: CTA (follow, repost, comment).
- Each tweet MUST be under 280 characters. Non-negotiable.
- Use "—" for emphasis, never bullet points.
- Numbers and specifics beat vague claims.
- Each tweet should work standalone (people quote-tweet individual tweets).
- No emojis at the start of tweets.

OUTPUT FORMAT (exactly — each tweet on its own line, numbered):
1/ [tweet text]

2/ [tweet text]

3/ [tweet text]

(continue)

Output ONLY the numbered tweets. No intro, no explanation.`,
};

function buildBrandSection(brandKit: BrandKit | null): string {
  if (!brandKit) return "";
  const parts: string[] = [];
  if (brandKit.company_name) {
    parts.push(`Company: ${brandKit.company_name}`);
  }
  if (brandKit.brand_voice) {
    parts.push(`Brand Voice: "${brandKit.brand_voice}"`);
  }
  if (brandKit.brand_colors?.length > 0) {
    parts.push(`Brand Colors: ${brandKit.brand_colors.join(", ")}`);
  }
  if (parts.length === 0) return "";
  return `\n## Brand Voice\n${parts.join("\n")}`;
}

function buildVoiceSection(voiceProfile: VoiceProfile | null): string {
  if (!voiceProfile) return "";
  const parts: string[] = [
    `Tone: ${voiceProfile.tone}`,
  ];
  if (voiceProfile.description) {
    parts.push(`Style: ${voiceProfile.description}`);
  }
  if (voiceProfile.example_posts?.length > 0) {
    const examples = voiceProfile.example_posts
      .slice(0, 2)
      .map((p, i) => `Example ${i + 1}:\n"""${p}"""`)
      .join("\n\n");
    parts.push(`Match the following writing examples closely:\n${examples}`);
  }
  return `\n## Voice Profile\n${parts.join("\n")}`;
}

function buildAudienceSection(audience: string): string {
  if (!audience || audience.trim().length === 0) return "";
  return `\n## Target Audience\nWrite directly for the following audience. Use language, references, and depth that resonates with them:\n${audience.trim()}`;
}

export function buildContentPrompt(input: PromptEngineInput): string {
  const { extraction, brandKit, voiceProfile, tone, audience, format } = input;

  const sections: string[] = [
    `You are a world-class content repurposing expert. Transform the provided source analysis into a high-quality, publishable ${format.replace(/_/g, " ")}.`,
  ];

  sections.push(`\n## Source Analysis\nKey Points:\n${extraction.keyPoints.map((kp, i) => `${i + 1}. ${kp}`).join("\n")}\n\nSummary:\n${extraction.summary}\n\nHooks to draw from:\n${extraction.hooks.map((h, i) => `${i + 1}. ${h}`).join("\n")}\n\nTopics:\n${extraction.topics.map((t, i) => `${i + 1}. ${t}`).join("\n")}`);

  const brandSection = buildBrandSection(brandKit);
  if (brandSection) sections.push(brandSection);

  const voiceSection = buildVoiceSection(voiceProfile);
  if (voiceSection) sections.push(voiceSection);

  sections.push(`\n## Tone\n${TONE_MAP[tone]}`);

  const audienceSection = buildAudienceSection(audience);
  if (audienceSection) sections.push(audienceSection);

  sections.push(`\n## Format Rules\n${FORMAT_RULES[format]}`);

  sections.push(`\n## Output\nGenerate the ${format.replace(/_/g, " ")} now. Output ONLY the final content — no labels, no explanations, no extra commentary.`);

  return sections.join("\n");
}
