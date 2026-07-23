import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import type { ExtractionResult } from "./index";

export async function extractBlog(url: string): Promise<ExtractionResult> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RepurposeAI/1.0; +https://repurpose.ai)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("The page took too long to load. Try a different URL.");
    }
    throw new Error("Could not reach this URL. Make sure it's publicly accessible.");
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch page (HTTP ${response.status}). Check the URL and try again.`);
  }

  const html = await response.text();

  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article || !article.textContent || article.textContent.trim().length < 100) {
    throw new Error(
      "Could not extract article content. The page might be behind a paywall, require JavaScript, or have an unusual layout."
    );
  }

  const cleanText = article.textContent
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\t/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();

  const words = cleanText.split(/\s+/);
  const truncated = words.slice(0, 4000).join(" ");
  const wordCount = Math.min(words.length, 4000);

  return {
    title: article.title || "Untitled Article",
    content: truncated,
    sourceType: "blog article",
    wordCount,
  };
}
