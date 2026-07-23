export function buildAnalysisPrompt(rawContent: string, sourceType: string): string {
  return `You are a content strategist. Analyze the following ${sourceType} content and extract the most valuable insights for social media repurposing.

SOURCE CONTENT:
"""
${rawContent.slice(0, 6000)}
"""

TASK: Provide a structured analysis:

1. MAIN TOPIC (1 sentence): What is this content fundamentally about?

2. KEY INSIGHTS (3-7 bullet points): The most interesting, surprising, or actionable takeaways. Focus on what would stop someone scrolling on LinkedIn or Twitter.

3. HOOK ANGLES (3 options): Three different angles to open a social post about this content. Each should be provocative, contrarian, or curiosity-driven.

4. QUOTABLE MOMENTS: Any specific statistics, data points, memorable phrases, or concrete examples worth highlighting.

5. TARGET AUDIENCE: Who would find this most valuable? Be specific (e.g., "B2B SaaS founders doing $1M-$10M ARR" not just "business people").

6. CORE TAKEAWAY (1 sentence): The single most important thing someone should remember.

Be concise. No filler. Only substance.`;
}
