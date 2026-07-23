"use client";

import { useEffect, useState } from "react";
import { Linkedin, Twitter, Layers, Mic2, Sparkles, Building2, Users, type LucideIcon } from "lucide-react";
import type { OutputFormat } from "@/lib/constants/formats";
import type { BrandKit } from "@/lib/types/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, capitalize } from "@/lib/utils";
import { useGenerateContext } from "@/contexts/generate-context";
import type { Tone } from "@/hooks/use-generate";
import { useVoiceProfiles } from "@/hooks/use-voice-profiles";
import { useUsage } from "@/components/providers/usage-provider";

const formatActions: { key: OutputFormat; label: string; icon: LucideIcon; color: string }[] = [
  { key: "linkedin_post", label: "LinkedIn Post", icon: Linkedin, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { key: "linkedin_carousel", label: "Carousel", icon: Layers, color: "text-purple-600 bg-purple-50 border-purple-200" },
  { key: "twitter_thread", label: "X Thread", icon: Twitter, color: "text-sky-500 bg-sky-50 border-sky-200" },
];

const tones: { key: Tone; label: string; description: string }[] = [
  { key: "thought_leader", label: "Thought Leader", description: "Authoritative, insightful, forward-thinking" },
  { key: "direct", label: "Direct", description: "Clear, concise, no-fluff" },
  { key: "casual", label: "Casual", description: "Conversational, friendly, relaxed" },
];

export function PromptPane() {
  const {
    outputFormat,
    voiceProfile,
    brandKit,
    extractedContent,
    tone,
    audience,
    geminiAnalysis,
    isAnalyzing,
    isGenerating,
    error,
    setOutputFormat,
    setVoiceProfile,
    setTone,
    setAudience,
    setBrandKit,
    generate,
  } = useGenerateContext();

  const { profiles, defaultProfile } = useVoiceProfiles();
  const { canUserGenerate, remaining } = useUsage();
  const [fetchedKit, setFetchedKit] = useState<BrandKit | null>(null);

  useEffect(() => {
    if (defaultProfile && !voiceProfile) {
      setVoiceProfile(defaultProfile);
    }
  }, [defaultProfile, voiceProfile, setVoiceProfile]);

  useEffect(() => {
    if (!brandKit && !fetchedKit) {
      fetch("/api/brand-kit")
        .then((r) => r.json())
        .then((json) => {
          if (json.data) {
            setFetchedKit(json.data as BrandKit);
            setBrandKit(json.data as BrandKit);
          }
        })
        .catch(() => {
          // Brand kit fetch failed — app continues without it
        });
    }
  }, [brandKit, fetchedKit, setBrandKit]);

  const hasSource = extractedContent.length > 0;
  const wordCount = extractedContent.split(/\s+/).filter(Boolean).length;

  const quickLabel = (count: number) => {
    if (!Number.isFinite(count)) return "Unlimited";
    return `${count} left`;
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
          2
        </div>
        <h3 className="text-sm font-semibold text-text-primary">Prompt</h3>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto scrollbar-hide">
        {hasSource && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5">
            <p className="text-xs font-medium text-green-800">
              {wordCount} words extracted
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-text-primary">
            <Building2 className="h-3.5 w-3.5 text-text-muted" />
            Brand kit
          </label>
          <Select
            value={brandKit?.id || "none"}
            onValueChange={(value) => {
              if (value === "none") {
                setBrandKit(null);
                return;
              }
              if (fetchedKit && fetchedKit.id === value) {
                setBrandKit(fetchedKit);
              }
            }}
          >
            <SelectTrigger disabled={!fetchedKit}>
              <SelectValue placeholder={fetchedKit ? fetchedKit.company_name || "Select brand kit" : "No brand kit"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No brand kit</SelectItem>
              {fetchedKit && (
                <SelectItem value={fetchedKit.id}>
                  {fetchedKit.company_name || "My Brand Kit"}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {fetchedKit?.brand_voice && (
            <p className="text-xs text-text-muted italic leading-relaxed line-clamp-2">
              &ldquo;{fetchedKit.brand_voice}&rdquo;
            </p>
          )}
          {!fetchedKit && (
            <p className="text-xs text-text-muted">
              Create a brand kit in Settings to inject your brand voice.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-text-primary">
            <Users className="h-3.5 w-3.5 text-text-muted" />
            Tone & audience
          </label>
          <div className="grid gap-1.5">
            {tones.map((t) => {
              const active = tone === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTone(t.key)}
                  aria-label={`Tone: ${t.label}`}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all duration-200",
                    active
                      ? "border-brand-500 bg-brand-50/50"
                      : "border-surface-3 bg-white hover:border-surface-4"
                  )}
                >
                  <div className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    active ? "bg-brand-600" : "bg-surface-3"
                  )} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">{t.label}</p>
                    <p className="text-xs text-text-muted">{t.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <Input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Target audience (e.g., B2B marketers, startup founders)"
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-text-primary">
            <Mic2 className="h-3.5 w-3.5 text-text-muted" />
            Voice profile
          </label>
          <Select
            value={voiceProfile?.id || "none"}
            onValueChange={(value) => {
              if (value === "none") {
                setVoiceProfile(null);
                return;
              }
              const profile = profiles.find((p) => p.id === value);
              setVoiceProfile(profile || null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a voice" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Neutral (no voice matching)</SelectItem>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name} — {capitalize(profile.tone)}
                  {profile.is_default ? " (default)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!canUserGenerate && hasSource && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-medium text-amber-800">
              You&apos;ve used all your generations. Upgrade to continue.
            </p>
          </div>
        )}

        <div className="mt-auto space-y-2 pt-2">
          <p className="text-xs font-semibold text-text-primary">Quick generate</p>
          <div className="grid gap-2">
            {formatActions.map((action) => {
              const isThisFormat = outputFormat === action.key && isGenerating;
              const handleGenerate = () => {
                setOutputFormat(action.key);
                generate(action.key);
              };
              return (
                <Button
                  key={action.key}
                  onClick={handleGenerate}
                  loading={isThisFormat && isGenerating}
                  disabled={!hasSource || (!canUserGenerate && !isGenerating)}
                  className="w-full justify-start gap-3 h-auto py-2.5 px-4"
                  variant={outputFormat === action.key && !isGenerating ? "default" : "outline"}
                  aria-label={`Generate ${action.label}`}
                >
                  <action.icon className="h-4 w-4 shrink-0" />
                  <span className="text-sm">{action.label}</span>
                  {geminiAnalysis && !isThisFormat && (
                    <span className="ml-auto text-[10px] font-medium rounded-full bg-purple-100 text-purple-700 px-2 py-0.5">
                      Gemini
                    </span>
                  )}
                  {!geminiAnalysis && !isThisFormat && (
                    <span className="ml-auto text-xs opacity-60">
                      {quickLabel(remaining)}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
