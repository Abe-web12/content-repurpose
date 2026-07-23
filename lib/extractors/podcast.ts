import type { ExtractionResult } from "./index";

export async function extractPodcast(url: string): Promise<ExtractionResult> {
  const isDirectAudio = /\.(mp3|m4a|wav|ogg|webm)(\?.*)?$/i.test(url);

  if (isDirectAudio) {
    throw new Error(
      "Direct audio transcription requires AssemblyAI integration (coming soon). For now, paste the podcast transcript text directly using the 'Paste Text' input."
    );
  }

  if (url.includes("spotify.com") || url.includes("podcasts.apple.com")) {
    throw new Error(
      "Spotify and Apple Podcast URLs are supported in the next update. For now, copy the episode transcript from the podcast's show notes or website and paste it using the 'Paste Text' input."
    );
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RepurposeAI/1.0)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error("Could not access podcast page.");
    }

    const html = await response.text();
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (textContent.length < 200) {
      throw new Error("Not enough text content found on this page.");
    }

    const wordCount = textContent.split(/\s+/).filter(Boolean).length;

    return {
      title: "Podcast Episode",
      content: textContent.slice(0, 15000),
      sourceType: "podcast show notes",
      wordCount: Math.min(wordCount, 4000),
    };
  } catch (err: any) {
    if (err.message.includes("Not enough") || err.message.includes("Could not")) {
      throw err;
    }
    throw new Error(
      "Could not extract podcast content. Paste the transcript directly using the 'Paste Text' input for best results."
    );
  }
}
