"use client";

import { useState, useCallback } from "react";
import type { InputType, OutputFormat } from "@/lib/constants/formats";
import type { VoiceProfile, BrandKit } from "@/lib/types/index";
import type { GeminiExtraction } from "@/lib/ai/gemini-provider";
import { useUsage } from "@/components/providers/usage-provider";
import { showError } from "@/components/ui/toast";

export type GenerateStep =
  | "input"
  | "fetching_transcript"
  | "analyzing_with_gemini"
  | "format"
  | "generating"
  | "output";

export type Tone = "thought_leader" | "direct" | "casual";

interface GenerateState {
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
}

const initialState: GenerateState = {
  step: "input",
  inputType: "youtube_url",
  inputValue: "",
  extractedContent: "",
  sourceTitle: "",
  outputFormat: "linkedin_post",
  voiceProfile: null,
  generatedContent: "",
  generationId: null,
  isExtracting: false,
  isFetchingTranscript: false,
  isAnalyzing: false,
  isGenerating: false,
  error: null,
  errorCode: null,
  tone: "thought_leader",
  audience: "",
  brandKit: null,
  geminiAnalysis: null,
};

function streamToContent(
  response: Response,
  onText: (text: string) => void,
  onError: (error: string) => void,
  onDone: (generationId: string | null) => void
): Promise<void> {
  return new Promise((resolve) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) {
      onError("Failed to read response stream");
      resolve();
      return;
    }

    let incomplete = "";
    let lastChunkTime = Date.now();
    const STREAM_INACTIVITY_MS = 30000;

    const r = reader!;

    async function read() {
      while (true) {
        if (Date.now() - lastChunkTime > STREAM_INACTIVITY_MS) {
          onError("Generation stalled. Try again.");
          resolve();
          return;
        }

        const { done, value } = await r.read();
        if (done) break;

        lastChunkTime = Date.now();
        const text = decoder.decode(value, { stream: true });
        const lines = (incomplete + text).split("\n");
        incomplete = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let parsed;
          try {
            parsed = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
          if (parsed.error) {
            onError(parsed.error);
            resolve();
            return;
          }
          if (parsed.text) onText(parsed.text);
          if (parsed.done) {
            onDone(parsed.generation_id || null);
          }
        }
      }
      onDone(null);
      resolve();
    }

    read().catch((err) => onError(err.message || "Stream error"));
  });
}

export function useGenerate() {
  const [state, setState] = useState<GenerateState>(initialState);
  const { canUserGenerate, incrementUsage } = useUsage();

  const updateState = useCallback((updates: Partial<GenerateState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const setInputType = useCallback((inputType: InputType) => {
    updateState({ inputType, inputValue: "", error: null });
  }, [updateState]);

  const setInputValue = useCallback((inputValue: string) => {
    updateState({ inputValue, error: null });
  }, [updateState]);

  const setOutputFormat = useCallback((outputFormat: OutputFormat) => {
    updateState({ outputFormat });
  }, [updateState]);

  const setVoiceProfile = useCallback((voiceProfile: VoiceProfile | null) => {
    updateState({ voiceProfile });
  }, [updateState]);

  const setTone = useCallback((tone: Tone) => {
    updateState({ tone });
  }, [updateState]);

  const setAudience = useCallback((audience: string) => {
    updateState({ audience });
  }, [updateState]);

  const setBrandKit = useCallback((brandKit: BrandKit | null) => {
    updateState({ brandKit });
  }, [updateState]);

  const clearSource = useCallback(() => {
    updateState({
      inputValue: "",
      extractedContent: "",
      sourceTitle: "",
      generatedContent: "",
      generationId: null,
      geminiAnalysis: null,
      error: null,
      errorCode: null,
      step: "input",
    });
  }, [updateState]);

  const extract = useCallback(async () => {
    if (!state.inputValue.trim()) {
      updateState({ error: "Please enter content to repurpose." });
      return false;
    }

    if (state.inputType === "youtube_url") {
      updateState({
        isExtracting: true,
        isFetchingTranscript: true,
        step: "fetching_transcript",
        error: null,
        geminiAnalysis: null,
      });

      try {
        const transcribeRes = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: state.inputValue.trim() }),
        });

        const transcribeJson = await transcribeRes.json();

        if (!transcribeJson.success) {
          const errorCode = transcribeJson.error || "UNKNOWN";
          const errMsg = transcribeJson.message || "Transcription failed";

          if (errorCode === "NO_CAPTIONS" || errorCode === "BLOCKED" || errorCode === "NETWORK_BLOCKED") {
            updateState({
              isExtracting: false,
              isFetchingTranscript: false,
              error: errMsg,
              errorCode,
              step: "input",
            });
          } else {
            updateState({
              isExtracting: false,
              isFetchingTranscript: false,
              error: errMsg,
              step: "input",
            });
          }
          return false;
        }

        const { transcript, title } = transcribeJson.data;

        updateState({
          extractedContent: transcript,
          sourceTitle: title,
          isFetchingTranscript: false,
          step: "analyzing_with_gemini",
        });

        const geminiRes = await fetch("/api/gemini-extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript }),
        });

        const geminiJson = await geminiRes.json();

        if (!geminiRes.ok) {
          const errMsg =
            typeof geminiJson.error === "string"
              ? geminiJson.error
              : "AI analysis failed";
          updateState({ isExtracting: false, error: errMsg, step: "format" });
          return false;
        }

        updateState({
          isExtracting: false,
          geminiAnalysis: geminiJson.data,
          generatedContent: "",
          step: "format",
        });

        return true;
      } catch (err: any) {
        updateState({
          isExtracting: false,
          isFetchingTranscript: false,
          error: err.message || "Network error",
          step: "input",
        });
        return false;
      }
    }

    updateState({ isExtracting: true, error: null });

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: state.inputValue.trim(),
          input_type: state.inputType,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        const errMsg = typeof json.error === "string" ? json.error : "Extraction failed";
        updateState({ isExtracting: false, error: errMsg });
        return false;
      }

      updateState({
        isExtracting: false,
        extractedContent: json.data.content,
        sourceTitle: json.data.title,
        generatedContent: "",
        step: "format",
      });

      return true;
    } catch (err: any) {
      updateState({ isExtracting: false, error: err.message || "Network error" });
      return false;
    }
  }, [state.inputValue, state.inputType, updateState]);

  const generate = useCallback(async (formatOverride?: OutputFormat) => {
    if (!canUserGenerate) {
      showError("You've reached your generation limit. Upgrade to continue.");
      return false;
    }

    if (!state.extractedContent.trim()) {
      updateState({ error: "No source content to generate from. Extract content first.", step: "format" });
      return false;
    }

    const format = formatOverride || state.outputFormat;

    updateState({ outputFormat: format, isAnalyzing: true, isGenerating: true, generatedContent: "", error: null, step: "generating" });

    try {
      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: state.extractedContent,
          source_type: state.inputType.replace("_url", "").replace("raw_", ""),
        }),
      });

      const analyzeJson = await analyzeResponse.json();

      if (!analyzeResponse.ok) {
        updateState({ isAnalyzing: false, isGenerating: false, error: analyzeJson.error || "Analysis failed", step: "format" });
        return false;
      }

      updateState({ isAnalyzing: false, isGenerating: true });

      const generateResponse = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: analyzeJson.data.analysis,
          output_format: format,
          voice_profile_id: state.voiceProfile?.id || null,
        }),
      });

      if (!generateResponse.ok) {
        const errorJson = await generateResponse.json();
        updateState({ isGenerating: false, error: errorJson.error || "Generation failed", step: "format" });
        return false;
      }

      let fullContent = "";
      let receivedGenerationId: string | null = null;
      let streamError: string | null = null;

      await streamToContent(
        generateResponse,
        (text) => {
          fullContent += text;
          setState((prev) => ({ ...prev, generatedContent: fullContent }));
        },
        (error) => {
          streamError = error;
          updateState({ isGenerating: false, error, step: "format" });
        },
        (generationId) => {
          receivedGenerationId = generationId;
        }
      );

      if (!fullContent && !streamError) {
        updateState({ isGenerating: false, error: "No content generated", step: "format" });
        return false;
      }

      if (streamError) return false;

      updateState({
        isGenerating: false,
        generatedContent: fullContent,
        generationId: receivedGenerationId,
        outputFormat: format,
        step: "output",
      });

      incrementUsage();
      return true;
    } catch (err: any) {
      updateState({ isAnalyzing: false, isGenerating: false, error: err.message || "Generation failed", step: "format" });
      return false;
    }
  }, [state.extractedContent, state.outputFormat, state.voiceProfile, state.inputType, canUserGenerate, updateState, incrementUsage]);

  const regenerate = useCallback(async () => {
    updateState({ generatedContent: "", generationId: null });
    return generate();
  }, [generate, updateState]);

  return {
    ...state,
    setInputType,
    setInputValue,
    setOutputFormat,
    setVoiceProfile,
    setTone,
    setAudience,
    setBrandKit,
    clearSource,
    extract,
    generate,
    regenerate,
    reset,
  };
}
