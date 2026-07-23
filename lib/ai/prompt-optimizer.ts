export interface OptimizationResult {
  optimizedPrompt: string;
  originalLength: number;
  optimizedLength: number;
  compressionRatio: number;
  estimatedTokensSaved: number;
  techniques: string[];
}

export interface OptimizationConfig {
  removeExcessWhitespace?: boolean;
  compressInstructions?: boolean;
  removeRedundancy?: boolean;
  useShorterSynonyms?: boolean;
  restructureAsBullets?: boolean;
  maxLength?: number;
}

export class PromptOptimizer {
  private static readonly COMMON_REDUNDANCIES = [
    /\b(please|kindly|thank you|thanks|i would like|can you|could you|i need you to)\b/gi,
    /\b(in order to|for the purpose of|with the intention of)\b/gi,
    /\b(due to the fact that|owing to the fact that|on account of)\b/gi,
    /\b(at this point in time|at the present time|in the near future)\b/gi,
    /\b(in the event that|in case|under the circumstances)\b/gi,
  ];

  private static readonly SHORTER_SYNONYMS: Record<string, string> = {
    "utilize": "use",
    "implement": "do",
    "facilitate": "help",
    "demonstrate": "show",
    "elaborate": "detail",
    "generate": "make",
    "communicate": "tell",
    "require": "need",
    "sufficient": "enough",
    "additional": "more",
    "subsequent": "next",
    "previous": "prior",
    "approximately": "about",
    "significant": "big",
    "numerous": "many",
    "currently": "now",
    "nevertheless": "but",
    "furthermore": "and",
    "consequently": "so",
    "particularly": "esp",
    "specifically": "esp",
  };

  static optimize(prompt: string, config?: OptimizationConfig): OptimizationResult {
    const techniques: string[] = [];
    let optimized = prompt;

    if (config?.removeExcessWhitespace !== false) {
      const before = optimized.length;
      optimized = optimized.replace(/\s+/g, " ").trim();
      if (optimized.length < before) {
        techniques.push("whitespace_removal");
      }
    }

    if (config?.compressInstructions !== false) {
      const before = optimized.length;
      optimized = optimized.replace(/\b(your task is to|your goal is to|you are to)\b/gi, "");
      optimized = optimized.replace(/\b(you are an expert|you are a professional|as an expert)\b/gi, "");
      if (optimized.length < before) {
        techniques.push("instruction_compression");
      }
    }

    if (config?.removeRedundancy !== false) {
      const before = optimized.length;
      for (const pattern of PromptOptimizer.COMMON_REDUNDANCIES) {
        optimized = optimized.replace(pattern, "");
      }
      if (optimized.length < before) {
        techniques.push("redundancy_removal");
      }
    }

    if (config?.useShorterSynonyms !== false) {
      const before = optimized.length;
      const wordPattern = new RegExp(
        `\\b(${Object.keys(PromptOptimizer.SHORTER_SYNONYMS).join("|")})\\b`,
        "gi",
      );
      optimized = optimized.replace(wordPattern, (match) => {
        const key = Object.keys(PromptOptimizer.SHORTER_SYNONYMS).find(
          (k) => k.toLowerCase() === match.toLowerCase(),
        );
        return key ? PromptOptimizer.SHORTER_SYNONYMS[key] : match;
      });
      if (optimized.length < before) {
        techniques.push("synonym_shortening");
      }
    }

    if (config?.restructureAsBullets !== false) {
      const bulletCandidates = optimized.split(/\.\s+/);
      if (bulletCandidates.length > 3 && optimized.length > 500) {
        optimized = bulletCandidates.map((s) => s.trim()).filter(Boolean).join("\n- ");
        optimized = "- " + optimized;
        techniques.push("bullet_restructure");
      }
    }

    if (config?.maxLength && optimized.length > config.maxLength) {
      optimized = optimized.slice(0, config.maxLength);
      const lastPeriod = optimized.lastIndexOf(".");
      if (lastPeriod > config.maxLength * 0.8) {
        optimized = optimized.slice(0, lastPeriod + 1);
      }
      techniques.push("max_length_truncation");
    }

    const originalLength = prompt.length;
    const optimizedLength = optimized.length;
    const compressionRatio = Math.round((1 - optimizedLength / originalLength) * 1000) / 10;
    const estimatedTokensSaved = Math.ceil((originalLength - optimizedLength) / 4);

    return {
      optimizedPrompt: optimized,
      originalLength,
      optimizedLength,
      compressionRatio: Math.max(0, compressionRatio),
      estimatedTokensSaved: Math.max(0, estimatedTokensSaved),
      techniques: [...new Set(techniques)],
    };
  }

  static async optimizeWithAI(prompt: string): Promise<OptimizationResult> {
    const baseline = this.optimize(prompt);

    if (baseline.optimizedLength > 200) {
      const double = this.optimize(baseline.optimizedPrompt, {
        removeExcessWhitespace: true,
        compressInstructions: true,
        removeRedundancy: true,
        useShorterSynonyms: true,
        restructureAsBullets: true,
      });

      return {
        optimizedPrompt: double.optimizedPrompt,
        originalLength: prompt.length,
        optimizedLength: double.optimizedLength,
        compressionRatio: Math.round(
          (1 - double.optimizedLength / prompt.length) * 1000,
        ) / 10,
        estimatedTokensSaved: Math.max(
          0,
          Math.ceil((prompt.length - double.optimizedLength) / 4),
        ),
        techniques: [...new Set([...baseline.techniques, ...double.techniques])],
      };
    }

    return baseline;
  }

  static estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  static formatPromptForContent(
    content: string,
    platform: string,
    tone: string,
    brandKit?: { brandVoice?: string; keywords?: string[]; targetAudience?: string },
  ): string {
    let prompt = `Generate ${platform} content`;

    if (tone) {
      prompt += ` in a ${tone} tone`;
    }

    if (brandKit?.brandVoice) {
      prompt += ` using the brand voice: "${brandKit.brandVoice}"`;
    }

    if (brandKit?.keywords?.length) {
      prompt += `. Include these keywords naturally: ${brandKit.keywords.join(", ")}`;
    }

    if (brandKit?.targetAudience) {
      prompt += `. Target audience: ${brandKit.targetAudience}`;
    }

    prompt += `.\n\nContent:\n${content}`;

    return PromptOptimizer.optimize(prompt, {
      compressInstructions: true,
      removeRedundancy: true,
      useShorterSynonyms: true,
    }).optimizedPrompt;
  }
}
