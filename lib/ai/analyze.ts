import { generateComplete } from "./provider";
import { buildAnalysisPrompt } from "./prompts/analyze-content";

export async function analyzeContent(
  rawContent: string,
  sourceType: string
): Promise<{ analysis: string; model: string }> {
  const prompt = buildAnalysisPrompt(rawContent, sourceType);
  const result = await generateComplete(prompt);

  return {
    analysis: result.content,
    model: result.model,
  };
}
