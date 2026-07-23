import type { ExtractionResult } from "./index";

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
    /(?:youtu\.be\/)([^?\s]+)/,
    /(?:youtube\.com\/embed\/)([^?\s]+)/,
    /(?:youtube\.com\/shorts\/)([^?\s]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function extractYouTube(url: string): Promise<ExtractionResult> {
  const videoId = extractVideoId(url);

  if (!videoId) {
    throw new Error("Invalid YouTube URL. Please provide a valid YouTube video link.");
  }

  try {
    const transcript = await fetchTranscript(videoId);

    if (transcript && transcript.length > 100) {
      const wordCount = transcript.split(/\s+/).filter(Boolean).length;

      return {
        title: `YouTube Video (${videoId})`,
        content: transcript.slice(0, 15000),
        sourceType: "youtube video transcript",
        wordCount,
      };
    }
  } catch {
  }

  try {
    const metadata = await fetchVideoMetadata(videoId);
    const wordCount = metadata.split(/\s+/).filter(Boolean).length;

    return {
      title: `YouTube Video (${videoId})`,
      content: metadata,
      sourceType: "youtube video description",
      wordCount,
    };
  } catch {
    throw new Error(
      "Could not extract content from this video. The video might be private, have no captions, or be region-locked. Try pasting the transcript manually using the 'Paste Text' option."
    );
  }
}

async function fetchTranscript(videoId: string): Promise<string> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(watchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) throw new Error("Failed to fetch video page");

  const html = await response.text();

  const captionMatch = html.match(/"captionTracks":\[(.+?)\]/);
  if (!captionMatch) throw new Error("No captions found");

  const captionData = JSON.parse(`[${captionMatch[1]}]`);
  const englishTrack = captionData.find(
    (track: any) =>
      track.languageCode === "en" || track.languageCode?.startsWith("en")
  );

  if (!englishTrack?.baseUrl) throw new Error("No English captions");

  const captionResponse = await fetch(englishTrack.baseUrl, {
    signal: AbortSignal.timeout(10000),
  });
  const captionXml = await captionResponse.text();

  const textSegments = captionXml.match(/<text[^>]*>(.*?)<\/text>/gs) || [];
  const transcript = textSegments
    .map((segment) =>
      segment
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, " ")
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return transcript;
}

async function fetchVideoMetadata(videoId: string): Promise<string> {
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

  const response = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });

  if (!response.ok) throw new Error("Failed to fetch video metadata");

  const data = await response.json();

  return `Video Title: ${data.title}\nAuthor: ${data.author_name}\n\nNote: Full transcript was not available. The AI will generate content based on the video title and available metadata. For best results, paste the video transcript directly.`;
}
