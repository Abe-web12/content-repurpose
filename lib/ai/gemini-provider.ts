const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_BASE_URL = process.env.AI_BASE_URL || "https://api.morphllm.com/v1";
const AI_MODEL = process.env.AI_MODEL || "morph-glm52-744b";

export interface GeminiExtraction {
  keyPoints: string[];
  summary: string;
  hooks: string[];
  topics: string[];
}

const EXTRACTION_PROMPT = `You are a content analysis expert. Analyze the following transcript and extract:

1. Key Points: the 5-7 most important points or arguments discussed.
2. Summary: a concise 2-3 sentence overview of the content.
3. Hooks: 3-4 attention-grabbing opening lines suitable for LinkedIn, X, or blog intros.
4. Topics: the main topics or themes covered.

Return ONLY valid JSON with this exact structure — no markdown, no code fences:
{
  "keyPoints": ["..."],
  "summary": "...",
  "hooks": ["..."],
  "topics": ["..."]

TRANSCRIPT:
`;

export async function extractKeyPoints(transcript: string): Promise<GeminiExtraction> {
  const truncated = transcript.slice(0, 30000);

  const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [{ role: "user", content: EXTRACTION_PROMPT + truncated }],
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI response did not contain valid JSON");
  }

  let parsed: Partial<GeminiExtraction>;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Failed to parse AI extraction response as JSON");
  }

  return {
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    hooks: Array.isArray(parsed.hooks) ? parsed.hooks : [],
    topics: Array.isArray(parsed.topics) ? parsed.topics : [],
  };
}
