export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import ytdl from "@distube/ytdl-core";

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

function parseCaptionXml(xml: string): string {
  const segments = xml.match(/<text[^>]*>(.*?)<\/text>/gs) || [];
  return segments
    .map((seg) =>
      seg
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
}

function json(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status });
}

async function fetchTranscript(videoId: string, url: string): Promise<{ transcript: string; title: string }> {
  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title || `YouTube Video (${videoId})`;
    const captionTracks =
      info.player_response?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    const englishTrack = captionTracks.find(
      (track: any) => track.languageCode === "en" || track.languageCode?.startsWith("en")
    );
    if (englishTrack?.baseUrl) {
      const captionResponse = await fetch(englishTrack.baseUrl, { signal: AbortSignal.timeout(10000) });
      if (!captionResponse.ok) throw new Error("NETWORK_BLOCKED");
      const captionXml = await captionResponse.text();
      const transcript = parseCaptionXml(captionXml);
      if (transcript) return { transcript, title };
    }
    throw new Error("NO_CAPTIONS");
  } catch (err: any) {
    if (err.message === "NO_CAPTIONS" || err.message === "NETWORK_BLOCKED") throw err;
    throw new Error("NO_CAPTIONS");
  }
}

async function fallbackFetchTranscript(videoId: string): Promise<{ transcript: string; title: string }> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(watchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("BLOCKED");
  const html = await response.text();
  const captionMatch = html.match(/"captionTracks":\[(.+?)\]/);
  if (!captionMatch) throw new Error("NO_CAPTIONS");
  const captionData = JSON.parse(`[${captionMatch[1]}]`);
  const englishTrack = captionData.find(
    (track: any) => track.languageCode === "en" || track.languageCode?.startsWith("en")
  );
  if (!englishTrack?.baseUrl) throw new Error("NO_CAPTIONS");
  const captionResponse = await fetch(englishTrack.baseUrl, { signal: AbortSignal.timeout(10000) });
  if (!captionResponse.ok) throw new Error("NETWORK_BLOCKED");
  const captionXml = await captionResponse.text();
  const transcript = parseCaptionXml(captionXml);
  if (!transcript) throw new Error("NO_CAPTIONS");
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const title = titleMatch ? titleMatch[1].replace(" - YouTube", "").trim() : `YouTube Video (${videoId})`;
  return { transcript, title };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return json({ success: false, error: "UNAUTHORIZED", message: "Please sign in to continue." }, 401);
    }

    const limit = await rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 10 });
    if (!limit.success) {
      return json({ success: false, error: "RATE_LIMITED", message: "Too many requests. Please wait a moment." }, 429);
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string" || !url.trim()) {
      return json({ success: false, error: "INVALID_URL", message: "Video URL is required." }, 400);
    }

    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      return json({ success: false, error: "INVALID_URL", message: "Invalid YouTube URL. Please provide a valid YouTube video link." }, 400);
    }

    let transcript = "";
    let title = `YouTube Video (${videoId})`;

    try {
      const result = await fetchTranscript(videoId, url.trim());
      transcript = result.transcript;
      title = result.title;
    } catch {
      try {
        const fallback = await fallbackFetchTranscript(videoId);
        transcript = fallback.transcript;
        title = fallback.title;
      } catch (fallbackErr: any) {
        const code = fallbackErr?.message || "NO_CAPTIONS";
        const messages: Record<string, string> = {
          NO_CAPTIONS: "No captions found for this video. The video may not have captions enabled, be private, or be region-locked. Try pasting the transcript manually using the 'Paste Text' option.",
          BLOCKED: "YouTube is blocking transcript requests from this server. Try pasting the content manually using the 'Paste Text' option.",
          NETWORK_BLOCKED: "Failed to download captions due to network restrictions. Try pasting the content manually using the 'Paste Text' option.",
        };
        return json({
          success: false,
          error: code,
          message: messages[code] || "Could not extract a transcript. Try pasting the content manually.",
        }, 200);
      }
    }

    if (!transcript || transcript.length < 50) {
      return json({
        success: false,
        error: "NO_CAPTIONS",
        message: "Could not extract a meaningful transcript. Try a different video or paste the content manually using the 'Paste Text' option.",
      }, 200);
    }

    return json({
      success: true,
      data: {
        transcript: transcript.slice(0, 15000),
        title,
        wordCount: transcript.split(/\s+/).filter(Boolean).length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    console.error("[TRANSCRIBE_ERROR]", err);
    return json({ success: false, error: "UNKNOWN", message }, 500);
  }
}
