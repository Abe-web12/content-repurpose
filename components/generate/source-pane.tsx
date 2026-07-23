"use client";

import { ArrowRight, CheckCircle2, Edit3, FileText, Globe, Youtube, Podcast, Link2, Loader2, Sparkles, BrainCircuit, type LucideIcon } from "lucide-react";
import type { InputType } from "@/lib/constants/formats";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGenerateContext } from "@/contexts/generate-context";

const tabs: { key: InputType; label: string; icon: LucideIcon }[] = [
  { key: "youtube_url", label: "YouTube", icon: Youtube },
  { key: "blog_url", label: "Blog URL", icon: Globe },
  { key: "podcast_url", label: "Podcast", icon: Podcast },
  { key: "raw_text", label: "Paste Text", icon: FileText },
];

const placeholders: Record<InputType, string> = {
  youtube_url: "https://youtube.com/watch?v=...",
  blog_url: "https://example.com/blog/article-title",
  podcast_url: "https://spotify.com/episode/... or audio URL",
  raw_text: "",
};

export function SourcePane() {
  const {
    step,
    inputType,
    inputValue,
    extractedContent,
    sourceTitle,
    isExtracting,
    isFetchingTranscript,
    error,
    errorCode,
    geminiAnalysis,
    setInputType,
    setInputValue,
    clearSource,
    extract,
  } = useGenerateContext();

  const hasExtracted = extractedContent.length > 0 && (step === "format" || step === "generating" || step === "output");
  const wordCount = extractedContent.split(/\s+/).filter(Boolean).length;

  const isTranscribing = step === "fetching_transcript" || isFetchingTranscript;
  const isAnalyzingGemini = step === "analyzing_with_gemini";

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
          1
        </div>
        <h3 className="text-sm font-semibold text-text-primary">Source</h3>
      </div>

      {isTranscribing && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
          <p className="text-sm font-medium text-text-primary">Fetching Transcript...</p>
          <p className="text-xs text-text-muted text-center max-w-[200px] leading-relaxed">
            Downloading captions from the video. This may take a moment.
          </p>
        </div>
      )}

      {isAnalyzingGemini && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50">
            <BrainCircuit className="h-6 w-6 animate-pulse text-purple-600" />
          </div>
          <p className="text-sm font-medium text-text-primary">Analyzing with Gemini...</p>
          <p className="text-xs text-text-muted text-center max-w-[200px] leading-relaxed">
            Extracting key points, summary, and hooks using AI.
          </p>
        </div>
      )}

      {hasExtracted ? (
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
              <span className="text-sm font-medium text-green-800 truncate">
                {sourceTitle || (
                  <span className="italic">Untitled source</span>
                )}
              </span>
            </div>
            <span className="shrink-0 text-xs font-medium text-green-700">{wordCount} words</span>
          </div>

          {geminiAnalysis && (
            <div className="grid gap-2 rounded-lg border border-purple-100 bg-purple-50/40 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                <span className="text-xs font-semibold text-purple-800">Gemini Analysis</span>
              </div>
              {geminiAnalysis.keyPoints.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-purple-700 mb-1">Key Points</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {geminiAnalysis.keyPoints.slice(0, 4).map((kp, i) => (
                      <li key={i} className="text-xs text-purple-800/80 leading-relaxed">{kp}</li>
                    ))}
                    {geminiAnalysis.keyPoints.length > 4 && (
                      <li className="text-xs text-purple-600">+{geminiAnalysis.keyPoints.length - 4} more</li>
                    )}
                  </ul>
                </div>
              )}
              {geminiAnalysis.summary && (
                <div>
                  <p className="text-xs font-medium text-purple-700 mb-0.5">Summary</p>
                  <p className="text-xs text-purple-800/80 leading-relaxed line-clamp-2">{geminiAnalysis.summary}</p>
                </div>
              )}
            </div>
          )}

          <div className="relative flex-1">
            <Textarea
              value={extractedContent}
              readOnly
              className="h-full min-h-[200px] resize-none bg-white/80 text-sm leading-relaxed text-text-primary scrollbar-hide"
            />
          </div>

          <Button variant="outline" size="sm" onClick={clearSource} className="self-start" aria-label="Change or clear source content">
            <Edit3 className="h-3.5 w-3.5" />
            Change source
          </Button>
        </div>
      ) : step !== "fetching_transcript" && step !== "analyzing_with_gemini" && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex gap-1 rounded-lg bg-surface-1 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setInputType(tab.key)}
                aria-label={`Input type: ${tab.label}`}
                aria-pressed={inputType === tab.key}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-all duration-200",
                  inputType === tab.key
                    ? "bg-white text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {inputType === "raw_text" ? (
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Paste your article, transcript, notes, or any content you want to repurpose..."
              className="min-h-[220px] flex-1 resize-none"
              error={error || undefined}
            />
          ) : (
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholders[inputType]}
                error={error || undefined}
                type="url"
                className="pl-9"
              />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <p className="text-xs text-red-700">{error}</p>
              {(errorCode === "NO_CAPTIONS" || errorCode === "BLOCKED" || errorCode === "NETWORK_BLOCKED") && (
                <button
                  type="button"
                  onClick={() => setInputType("raw_text")}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-800 transition-colors hover:bg-red-200"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Switch to Paste Text
                </button>
              )}
            </div>
          )}

          {inputType !== "raw_text" && (
            <p className="text-xs text-text-muted">
              Paste a public URL. We&apos;ll extract the content automatically.
            </p>
          )}

          <Button
            onClick={extract}
            loading={isExtracting}
            disabled={!inputValue.trim()}
            className="w-full"
            aria-label="Extract content from source"
          >
            {isExtracting ? "Extracting..." : "Extract content"}
            {!isExtracting && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}
