"use client";

import { useState, useCallback, useRef } from "react";
import { Copy, Check, RotateCcw, Download, RefreshCw, Sparkles, Loader2, Calendar, Linkedin, Twitter, Globe, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useGenerateContext } from "@/contexts/generate-context";
import { showSuccess, showError } from "@/components/ui/toast";
import type { OutputFormat } from "@/lib/constants/formats";
import type { ScheduledPlatform } from "@/lib/types/index";

const formatLabels: Record<OutputFormat, string> = {
  linkedin_post: "LinkedIn Post",
  linkedin_carousel: "LinkedIn Carousel",
  twitter_thread: "X (Twitter) Thread",
};

const platformOptions: { value: ScheduledPlatform; label: string; icon: typeof Linkedin }[] = [
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "twitter", label: "X / Twitter", icon: Twitter },
  { value: "blog", label: "Blog", icon: Globe },
  { value: "other", label: "Other", icon: FileText },
];

function formatPlatformLabel(format: OutputFormat): ScheduledPlatform {
  if (format === "twitter_thread") return "twitter";
  if (format === "linkedin_post" || format === "linkedin_carousel") return "linkedin";
  return "other";
}

export function PreviewPane() {
  const {
    step,
    outputFormat,
    generatedContent,
    isAnalyzing,
    isGenerating,
    error,
    regenerate,
  } = useGenerateContext();

  const [editContent, setEditContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedulePlatform, setSchedulePlatform] = useState<ScheduledPlatform>("linkedin");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const hasContent = generatedContent.length > 0;
  const isLoading = step === "generating";
  const isWorking = isLoading || isAnalyzing || isGenerating;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const content = editContent || generatedContent;

  const handleCopy = useCallback(async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      showSuccess("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [content]);

  const handleRegenerate = useCallback(async () => {
    if (isWorking) return;
    const result = await regenerate();
    if (result) {
      setEditContent("");
    }
  }, [regenerate, isWorking]);

  const handleExport = useCallback(() => {
    if (!content) return;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `repurposed-${outputFormat}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSuccess("Content exported");
  }, [content, outputFormat]);

  const handleSchedule = useCallback(async () => {
    if (!content || !scheduleDate || !scheduleTime) return;

    setScheduling(true);
    setScheduleSuccess(false);

    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          platform: schedulePlatform,
          scheduled_at: scheduledAt.toISOString(),
          status: "scheduled",
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setScheduleSuccess(true);
        showSuccess("Post scheduled!");
        setTimeout(() => {
          setScheduleOpen(false);
          setScheduleSuccess(false);
        }, 1200);
      } else {
        showError(json.error || "Failed to schedule");
      }
    } catch {
      showError("Network error scheduling post");
    } finally {
      setScheduling(false);
    }
  }, [content, scheduleDate, scheduleTime, schedulePlatform]);

  const openSchedule = useCallback(() => {
    setSchedulePlatform(formatPlatformLabel(outputFormat));
    const now = new Date();
    now.setDate(now.getDate() + 1);
    setScheduleDate(now.toISOString().split("T")[0]);
    setScheduleTime(now.toTimeString().slice(0, 5));
    setScheduleSuccess(false);
    setScheduleOpen(true);
  }, [outputFormat]);

  const wordCount = content
    ? content.split(/\s+/).filter(Boolean).length
    : 0;

  const heading = formatLabels[outputFormat] || "Output";

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
          3
        </div>
        <h3 className="text-sm font-semibold text-text-primary">Preview</h3>
      </div>

      {isLoading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          </div>
          <p className="text-sm font-medium text-text-primary">
            Generating your content...
          </p>
          <p className="text-xs text-text-muted">
            This may take a moment for longer sources.
          </p>
        </div>
      )}

      {error && !isLoading && step !== "input" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <span className="text-xl text-red-500">!</span>
          </div>
          <p className="text-sm font-medium text-red-700 text-center max-w-[280px]">
            {error}
          </p>
          <p className="text-xs text-red-500 text-center max-w-[240px]">
            Try adjusting your source or check your API configuration.
          </p>
        </div>
      )}

      {!error && !isLoading && (step === "format" || step === "input") && !hasContent && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
            <Sparkles className="h-6 w-6 text-text-muted" />
          </div>
          <p className="text-sm font-medium text-text-primary">
            Select a format & generate
          </p>
          <p className="text-xs text-text-muted text-center max-w-[200px] leading-relaxed">
            Choose an output format and click a quick-action button to create your content.
          </p>
        </div>
      )}

      {hasContent && step === "output" && (
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary">{heading}</span>
              <span className="text-xs text-text-muted">
                {wordCount} words
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              disabled={isWorking}
              className="text-text-muted"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isWorking && "animate-spin")} />
              Regenerate
            </Button>
          </div>

          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setEditContent(e.target.value)}
              className="h-full min-h-[280px] resize-none text-sm leading-relaxed bg-white scrollbar-hide"
              placeholder="Edit your content here..."
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5"
              aria-label="Copy content to clipboard"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-green-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!content}
              className="gap-1.5"
              aria-label="Export content as text file"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>

            <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  onClick={openSchedule}
                  disabled={!content}
                  className="gap-1.5"
                  aria-label="Open schedule dialog"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Schedule
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Schedule Post</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-text-primary">Platform</label>
                    <Select
                      value={schedulePlatform}
                      onValueChange={(v) => setSchedulePlatform(v as ScheduledPlatform)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {platformOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <opt.icon className="h-3.5 w-3.5" />
                              {opt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-text-primary">Date</label>
                      <Input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-text-primary">Time</label>
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="rounded-lg bg-surface-1 p-3 max-h-20 overflow-y-auto">
                    <p className="text-xs text-text-muted line-clamp-3">{content}</p>
                  </div>
                  <Button
                    onClick={handleSchedule}
                    loading={scheduling}
                    disabled={!scheduleDate || !scheduleTime}
                    className="w-full"
                  >
                    {scheduleSuccess ? (
                      <>
                        <Check className="h-4 w-4" />
                        Scheduled
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4" />
                        Save to schedule
                      </>
                    )}
                  </Button>
                  {scheduleSuccess && (
                    <p className="text-center text-xs text-green-600">
                      Post scheduled successfully!
                    </p>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isWorking || !content}
              className="gap-1.5 ml-auto"
              aria-label="Regenerate content"
            >
              <RotateCcw className={cn("h-3.5 w-3.5", isWorking && "animate-spin")} />
              Retry
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
