export interface QualityScore {
  overall: number;
  dimensions: {
    relevance: number;
    coherence: number;
    toneConsistency: number;
    keywordUsage: number;
    brandAlignment: number;
    readability: number;
    engagement: number;
  };
  suggestions: string[];
  thresholds: {
    pass: number;
    warning: number;
  };
}

export interface ScoringConfig {
  minRelevance?: number;
  minCoherence?: number;
  minToneConsistency?: number;
  minKeywordUsage?: number;
  minBrandAlignment?: number;
  minReadability?: number;
  minEngagement?: number;
  overallThreshold?: number;
}

export class QualityScorer {
  private static readonly DEFAULT_THRESHOLDS = {
    pass: 7.5,
    warning: 5.0,
  };

  static score(
    content: string,
    options: {
      platform?: string;
      tone?: string;
      keywords?: string[];
      brandVoice?: string;
      targetAudience?: string;
      originalContent?: string;
    },
    config?: ScoringConfig,
  ): QualityScore {
    const dimensions = {
      relevance: this.scoreRelevance(content, options.originalContent),
      coherence: this.scoreCoherence(content),
      toneConsistency: this.scoreToneConsistency(content, options.tone),
      keywordUsage: this.scoreKeywordUsage(content, options.keywords),
      brandAlignment: this.scoreBrandAlignment(content, options.brandVoice),
      readability: this.scoreReadability(content),
      engagement: this.scoreEngagement(content, options.platform),
    };

    const overall =
      dimensions.relevance * 0.2 +
      dimensions.coherence * 0.15 +
      dimensions.toneConsistency * 0.15 +
      dimensions.keywordUsage * 0.1 +
      dimensions.brandAlignment * 0.15 +
      dimensions.readability * 0.1 +
      dimensions.engagement * 0.15;

    const suggestions = this.generateSuggestions(dimensions, config);

    return {
      overall: Math.round(overall * 10) / 10,
      dimensions: {
        relevance: Math.round(dimensions.relevance * 10) / 10,
        coherence: Math.round(dimensions.coherence * 10) / 10,
        toneConsistency: Math.round(dimensions.toneConsistency * 10) / 10,
        keywordUsage: Math.round(dimensions.keywordUsage * 10) / 10,
        brandAlignment: Math.round(dimensions.brandAlignment * 10) / 10,
        readability: Math.round(dimensions.readability * 10) / 10,
        engagement: Math.round(dimensions.engagement * 10) / 10,
      },
      suggestions,
      thresholds: {
        pass: config?.overallThreshold ?? this.DEFAULT_THRESHOLDS.pass,
        warning: this.DEFAULT_THRESHOLDS.warning,
      },
    };
  }

  static isPassing(score: QualityScore): boolean {
    return score.overall >= score.thresholds.pass;
  }

  static isWarning(score: QualityScore): boolean {
    return score.overall < score.thresholds.pass && score.overall >= score.thresholds.warning;
  }

  static isFailing(score: QualityScore): boolean {
    return score.overall < score.thresholds.warning;
  }

  private static scoreRelevance(content: string, original?: string): number {
    if (!original) return 8.0;

    const contentWords = new Set(content.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
    const originalWords = new Set(original.toLowerCase().split(/\s+/).filter((w) => w.length > 3));

    if (contentWords.size === 0 || originalWords.size === 0) return 5.0;

    let overlap = 0;
    for (const word of contentWords) {
      if (originalWords.has(word)) overlap++;
    }

    const score = (overlap / Math.min(contentWords.size, originalWords.size)) * 10;
    return Math.min(10, Math.max(0, score * 1.5));
  }

  private static scoreCoherence(content: string): number {
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length < 2) return 8.0;

    const transitionWords = [
      "however", "therefore", "moreover", "furthermore", "consequently",
      "additionally", "nevertheless", "meanwhile", "subsequently", "indeed",
      "thus", "hence", "accordingly", "besides", "likewise", "notably",
      "specifically", "particularly", "conversely", "alternatively",
    ];

    let transitionCount = 0;
    for (const sentence of sentences) {
      const firstWord = sentence.trim().split(/\s+/)[0]?.toLowerCase();
      if (firstWord && transitionWords.includes(firstWord)) {
        transitionCount++;
      }
    }

    const avgSentenceLength =
      content.split(/\s+/).length / Math.max(1, sentences.length);
    const complexityScore =
      avgSentenceLength < 10 ? 7 : avgSentenceLength < 20 ? 9 : avgSentenceLength < 30 ? 8 : 6;

    const transitionScore = Math.min(10, (transitionCount / Math.max(1, sentences.length)) * 20 + 5);

    return Math.round((complexityScore + transitionScore) / 2 * 10) / 10;
  }

  private static scoreToneConsistency(content: string, tone?: string): number {
    if (!tone) return 8.0;

    const toneMarkers: Record<string, RegExp[]> = {
      professional: [/\b(i recommend|our solution|industry|expertise|strategic)\b/gi],
      casual: [/\b(hey|guys|awesome|cool|check out|super)\b/gi],
      formal: [/\b(therefore|thus|hence|pursuant|regarding|commence)\b/gi],
      humorous: [/\b(lol|funny|hilarious|silly|ridiculous)\b/gi, /[!]{2,}/g],
      persuasive: [/\b(buy|subscribe|limited|exclusive|now|today|don't miss)\b/gi],
      informative: [/\b(research|study|data|analysis|findings|according to)\b/gi],
    };

    const targetMarkers = toneMarkers[tone.toLowerCase()];
    if (!targetMarkers) return 7.0;

    let positiveMatches = 0;
    let totalChecks = 0;
    for (const pattern of targetMarkers) {
      const matches = content.match(pattern);
      if (matches) positiveMatches += matches.length;
      totalChecks++;
    }

    const detectedTones: string[] = [];
    for (const [otherTone, markers] of Object.entries(toneMarkers)) {
      if (otherTone === tone.toLowerCase()) continue;
      let matches = 0;
      for (const pattern of markers) {
        const found = content.match(pattern);
        if (found) matches += found.length;
      }
      if (matches > 2) detectedTones.push(otherTone);
    }

    const purityBonus = detectedTones.length === 0 ? 2 : 0;
    const score = Math.min(10, (positiveMatches / totalChecks) * 2 + 5 + purityBonus);
    return score;
  }

  private static scoreKeywordUsage(content: string, keywords?: string[]): number {
    if (!keywords || keywords.length === 0) return 8.0;

    const contentLower = content.toLowerCase();
    let foundKeywords = 0;

    for (const kw of keywords) {
      if (contentLower.includes(kw.toLowerCase())) {
        foundKeywords++;
      }
    }

    const coverage = foundKeywords / keywords.length;
    if (coverage >= 0.8) return Math.min(10, coverage * 10);
    if (coverage >= 0.5) return coverage * 8;
    return coverage * 5;
  }

  private static scoreBrandAlignment(content: string, brandVoice?: string): number {
    if (!brandVoice) return 8.0;

    const voiceWords = brandVoice
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    if (voiceWords.length === 0) return 8.0;

    const contentLower = content.toLowerCase();
    let matches = 0;

    for (const word of voiceWords) {
      if (contentLower.includes(word)) matches++;
    }

    const matchRate = matches / voiceWords.length;
    return Math.min(10, matchRate * 10 + 3);
  }

  private static scoreReadability(content: string): number {
    const words = content.split(/\s+/).filter(Boolean);
    if (words.length === 0) return 5.0;

    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const avgWordsPerSentence = words.length / Math.max(1, sentences.length);

    const longWords = words.filter((w) => w.length > 6).length;
    const longWordRatio = longWords / words.length;

    const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const avgParagraphLength = words.length / Math.max(1, paragraphs.length);

    let score = 10;
    if (avgWordsPerSentence > 25) score -= 2;
    if (avgWordsPerSentence > 35) score -= 2;
    if (avgWordsPerSentence < 5) score -= 1;
    if (longWordRatio > 0.3) score -= 2;
    if (longWordRatio > 0.5) score -= 1;
    if (avgParagraphLength > 100) score -= 1;
    if (avgParagraphLength > 200) score -= 1;

    return Math.max(0, Math.min(10, score));
  }

  private static scoreEngagement(content: string, platform?: string): number {
    const words = content.split(/\s+/).filter(Boolean);
    if (words.length === 0) return 5.0;

    let score = 7.0;

    const questionCount = (content.match(/\?/g) || []).length;
    if (questionCount > 0) score += Math.min(1.5, questionCount * 0.3);

    const exclamationCount = (content.match(/!/g) || []).length;
    if (exclamationCount > 0) score += Math.min(1, exclamationCount * 0.2);

    const ctaWords = ["subscribe", "follow", "share", "comment", "like", "click", "sign up", "learn more", "get started"];
    const hasCTA = ctaWords.some((w) => content.toLowerCase().includes(w));
    if (hasCTA) score += 1;

    if (platform === "twitter" || platform === "x") {
      if (words.length > 25) score -= 1;
      if (words.length < 5) score -= 0.5;
    } else if (platform === "linkedin") {
      if (words.length > 200) score -= 0.5;
      if (questionCount >= 1) score += 0.5;
    }

    return Math.max(0, Math.min(10, score));
  }

  private static generateSuggestions(
    dimensions: Record<string, number>,
    config?: ScoringConfig,
  ): string[] {
    const suggestions: string[] = [];

    const checks: Array<{ key: string; label: string; threshold?: number }> = [
      { key: "relevance", label: "relevance to source content", threshold: config?.minRelevance },
      { key: "coherence", label: "coherence and flow", threshold: config?.minCoherence },
      { key: "toneConsistency", label: "tone consistency", threshold: config?.minToneConsistency },
      { key: "keywordUsage", label: "keyword usage", threshold: config?.minKeywordUsage },
      { key: "brandAlignment", label: "brand alignment", threshold: config?.minBrandAlignment },
      { key: "readability", label: "readability", threshold: config?.minReadability },
      { key: "engagement", label: "engagement potential", threshold: config?.minEngagement },
    ];

    for (const check of checks) {
      const threshold = check.threshold ?? 6;
      if (dimensions[check.key] < threshold) {
        suggestions.push(`Improve ${check.label} (score: ${Math.round(dimensions[check.key] * 10) / 10}/${threshold})`);
      }
    }

    if (suggestions.length === 0) {
      suggestions.push("Content quality is strong across all dimensions");
    }

    return suggestions;
  }

  static async autoImprove(content: string, score: QualityScore): Promise<{ improved: boolean; content: string; changes: string[] }> {
    if (QualityScorer.isPassing(score)) {
      return { improved: false, content, changes: [] };
    }

    const changes: string[] = [];
    let improved = content;

    if (score.dimensions.readability < 6) {
      const sentences = improved.split(/[.!?]+/);
      const short = sentences
        .map((s) => {
          const words = s.trim().split(/\s+/);
          if (words.length > 25) {
            const mid = Math.ceil(words.length / 2);
            return `${words.slice(0, mid).join(" ")}. ${words.slice(mid).join(" ")}`;
          }
          return s.trim();
        })
        .join(". ");
      improved = short;
      changes.push("Split long sentences for readability");
    }

    if (score.dimensions.engagement < 6) {
      if (!improved.includes("?")) {
        improved += "\n\nWhat are your thoughts on this?";
        changes.push("Added engagement question");
      }
    }

    if (score.dimensions.keywordUsage < 5 && score.dimensions.keywordUsage > 0) {
      changes.push("Consider adding more target keywords naturally");
    }

    return {
      improved: changes.length > 0,
      content: improved,
      changes,
    };
  }
}
