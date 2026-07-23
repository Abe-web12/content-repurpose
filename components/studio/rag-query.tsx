"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Clock,
  DollarSign,
  Hash,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const PROVIDERS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
  gemini: ["gemini-1.5-flash", "gemini-1.5-pro"],
  groq: ["llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768"],
  mistral: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest"],
  deepseek: ["deepseek-chat", "deepseek-coder"],
};

interface KnowledgeBase {
  id: string;
  name: string;
}

interface Citation {
  id: string;
  text: string;
  score: number;
  source: string;
  documentTitle: string;
}

interface RagQueryResult {
  answer: string;
  citations: Citation[];
  latency: number;
  tokens: number;
  cost: number;
}

interface RagQueryProps {
  knowledgeBases: KnowledgeBase[];
  onQuery: (params: {
    knowledgeBaseIds: string[];
    query: string;
    provider: string;
    model: string;
    systemPrompt: string;
    topK: number;
    minScore: number;
  }) => Promise<RagQueryResult>;
}

export function RagQuery({ knowledgeBases, onQuery }: RagQueryProps) {
  const [selectedKBs, setSelectedKBs] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [topK, setTopK] = useState(5);
  const [minScore, setMinScore] = useState(0.5);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RagQueryResult | null>(null);

  const models = PROVIDERS[provider] ?? [];

  const toggleKB = (id: string) => {
    setSelectedKBs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleRun = async () => {
    if (!query.trim() || selectedKBs.length === 0) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await onQuery({
        knowledgeBaseIds: selectedKBs,
        query: query.trim(),
        provider,
        model,
        systemPrompt,
        topK,
        minScore,
      });
      setResult(res);
    } catch {
      setResult({
        answer: "An error occurred while processing the query.",
        citations: [],
        latency: 0,
        tokens: 0,
        cost: 0,
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Knowledge Bases
            </Label>
            <div className="flex flex-wrap gap-2">
              {knowledgeBases.map((kb) => (
                <Badge
                  key={kb.id}
                  variant={selectedKBs.includes(kb.id) ? "default" : "outline"}
                  className="cursor-pointer transition-all text-xs"
                  onClick={() => toggleKB(kb.id)}
                >
                  {kb.name}
                </Badge>
              ))}
              {knowledgeBases.length === 0 && (
                <span className="text-xs text-text-muted">No knowledge bases available</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rag-query" className="text-sm font-medium">Query</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-text-muted" />
              <Textarea
                id="rag-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about your documents..."
                className="pl-9 min-h-[80px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Provider</Label>
              <Select
                value={provider}
                onValueChange={(v) => {
                  setProvider(v);
                  setModel(PROVIDERS[v][0]);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(PROVIDERS).map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">System Prompt</Label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Optional system prompt..."
              className="min-h-[60px] text-xs"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Advanced Options
            </button>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="grid grid-cols-2 gap-3 mt-3"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs">Top K</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={topK}
                    onChange={(e) => setTopK(parseInt(e.target.value) || 5)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Min Score</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={minScore}
                    onChange={(e) => setMinScore(parseFloat(e.target.value) || 0.5)}
                    className="h-9 text-xs"
                  />
                </div>
              </motion.div>
            )}
          </div>

          <Button
            onClick={handleRun}
            disabled={!query.trim() || selectedKBs.length === 0 || running}
            loading={running}
          >
            <Play className="h-4 w-4 mr-1" />
            {running ? "Querying..." : "Run Query"}
          </Button>
        </div>

        <div className="space-y-4 lg:col-span-1">
          {running && (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent mx-auto mb-2" />
                  <p className="text-xs text-text-muted">Querying knowledge bases...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {result && !running && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Answer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {highlightCitations(result.answer, result.citations)}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2 text-xs text-text-muted">
                {result.latency > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {result.latency}ms
                  </Badge>
                )}
                {result.tokens > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Hash className="h-3 w-3" />
                    {result.tokens} tokens
                  </Badge>
                )}
                {result.cost > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${result.cost.toFixed(6)}
                  </Badge>
                )}
              </div>

              {result.citations.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Citations ({result.citations.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {result.citations.map((citation, idx) => (
                      <div
                        key={citation.id}
                        className="rounded-lg border border-surface-3 bg-surface-1 p-2.5 space-y-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-medium text-text-primary">
                            [{idx + 1}] {citation.documentTitle}
                          </span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {(citation.score * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <p className="text-xs text-text-muted line-clamp-2">
                          {citation.text}
                        </p>
                        {citation.source && (
                          <a
                            href={citation.source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] text-brand-600 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Source
                          </a>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function highlightCitations(text: string, citations: Citation[]): React.ReactNode {
  if (citations.length === 0) return text;

  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, idx) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      const num = parseInt(match[1]);
      const citation = citations[num - 1];
      if (citation) {
        return (
          <sup
            key={idx}
            className="text-brand-600 font-medium cursor-help"
            title={`${citation.documentTitle} (${(citation.score * 100).toFixed(0)}%)`}
          >
            [{num}]
          </sup>
        );
      }
    }
    return part;
  });
}
