"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { InputType, OutputFormat } from "@/lib/constants/formats";
import type { VoiceProfile, BrandKit } from "@/lib/types/index";
import type { GeminiExtraction } from "@/lib/ai/gemini-provider";
import type { GenerateStep, Tone } from "@/hooks/use-generate";

interface GenerateContextValue {
  step: GenerateStep;
  inputType: InputType;
  inputValue: string;
  extractedContent: string;
  sourceTitle: string;
  outputFormat: OutputFormat;
  voiceProfile: VoiceProfile | null;
  generatedContent: string;
  generationId: string | null;
  isExtracting: boolean;
  isFetchingTranscript: boolean;
  isAnalyzing: boolean;
  isGenerating: boolean;
  error: string | null;
  errorCode: string | null;
  tone: Tone;
  audience: string;
  brandKit: BrandKit | null;
  geminiAnalysis: GeminiExtraction | null;
  setInputType: (type: InputType) => void;
  setInputValue: (value: string) => void;
  setOutputFormat: (format: OutputFormat) => void;
  setVoiceProfile: (profile: VoiceProfile | null) => void;
  setTone: (tone: Tone) => void;
  setAudience: (audience: string) => void;
  setBrandKit: (kit: BrandKit | null) => void;
  clearSource: () => void;
  extract: () => Promise<boolean>;
  generate: (formatOverride?: OutputFormat) => Promise<boolean>;
  regenerate: () => Promise<boolean>;
  reset: () => void;
}

const GenerateContext = createContext<GenerateContextValue | null>(null);

export function GenerateProvider({
  value,
  children,
}: {
  value: GenerateContextValue;
  children: ReactNode;
}) {
  return (
    <GenerateContext.Provider value={value}>
      {children}
    </GenerateContext.Provider>
  );
}

export function useGenerateContext() {
  const ctx = useContext(GenerateContext);
  if (!ctx) {
    throw new Error("useGenerateContext must be used within a GenerateProvider");
  }
  return ctx;
}
