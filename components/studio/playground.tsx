"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Save,
  Plus,
  X,
  Copy,
  Check,
  GripVertical,
  Sigma,
  Thermometer,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const PROVIDERS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
  gemini: ["gemini-1.5-flash", "gemini-1.5-pro"],
  morphllm: ["gpt-4o-mini", "gpt-4o"],
  groq: ["llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768"],
  mistral: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest"],
  deepseek: ["deepseek-chat", "deepseek-coder"],
  openrouter: ["openai/gpt-4o", "openai/gpt-4o-mini", "anthropic/claude-3-opus", "google/gemini-1.5-flash"],
};

interface PlaygroundConfig {
  id: string;
  provider: string;
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  systemPrompt: string;
  userPrompt: string;
}

interface PlaygroundProps {
  onRun: (config: PlaygroundConfig) => Promise<{
    output: string;
    latency: number;
    tokens: number;
    cost: number;
  }>;
  onSave: (config: PlaygroundConfig) => void;
}

function defaultConfig(): PlaygroundConfig {
  return {
    id: crypto.randomUUID(),
    provider: "openai",
    model: "gpt-4o",
    temperature: 0.7,
    topP: 1,
    maxTokens: 2048,
    systemPrompt: "",
    userPrompt: "",
  };
}

function ConfigPanel({
  config,
  onChange,
  onRemove,
  removable,
  result,
  running,
}: {
  config: PlaygroundConfig;
  onChange: (config: PlaygroundConfig) => void;
  onRemove?: () => void;
  removable?: boolean;
  result?: { output: string; latency: number; tokens: number; cost: number } | null;
  running?: boolean;
}) {
  const models = PROVIDERS[config.provider] ?? [];

  return (
    <Card className="flex-1 min-w-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            {config.provider} / {config.model}
          </CardTitle>
          {removable && onRemove && (
            <Button variant="ghost" size="icon-sm" onClick={onRemove}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Provider</Label>
            <Select
              value={config.provider}
              onValueChange={(v) =>
                onChange({ ...config, provider: v, model: PROVIDERS[v][0] })
              }
            >
              <SelectTrigger className="h-8 text-xs">
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
            <Select
              value={config.model}
              onValueChange={(v) => onChange({ ...config, model: v })}
            >
              <SelectTrigger className="h-8 text-xs">
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

        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1">
                <Thermometer className="h-3 w-3" /> Temperature
              </Label>
              <span className="text-xs text-text-muted">{config.temperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature}
              onChange={(e) => onChange({ ...config, temperature: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1">
                <Sigma className="h-3 w-3" /> Top P
              </Label>
              <span className="text-xs text-text-muted">{config.topP.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={config.topP}
              onChange={(e) => onChange({ ...config, topP: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1">
                <Layers className="h-3 w-3" /> Max Tokens
              </Label>
              <span className="text-xs text-text-muted">{config.maxTokens}</span>
            </div>
            <input
              type="range"
              min="64"
              max="16384"
              step="64"
              value={config.maxTokens}
              onChange={(e) => onChange({ ...config, maxTokens: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">System Prompt</Label>
          <Textarea
            value={config.systemPrompt}
            onChange={(e) => onChange({ ...config, systemPrompt: e.target.value })}
            placeholder="Optional system prompt..."
            className="min-h-[60px] text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">User Prompt</Label>
          <Textarea
            value={config.userPrompt}
            onChange={(e) => onChange({ ...config, userPrompt: e.target.value })}
            placeholder="Enter your prompt..."
            className="min-h-[80px] text-xs"
          />
        </div>

        {running && (
          <div className="flex items-center justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        )}

        {result && !running && (
          <div className="space-y-3">
            <Separator />
            <div className="space-y-1.5">
              <Label className="text-xs">Output</Label>
              <div className="rounded-lg border border-surface-3 bg-surface-1 p-3 text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                {result.output}
              </div>
            </div>
            <div className="flex gap-3 text-xs text-text-muted">
              <span>{result.latency}ms</span>
              <span>{result.tokens} tokens</span>
              <span>${result.cost.toFixed(6)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Playground({ onRun, onSave }: PlaygroundProps) {
  const [configs, setConfigs] = useState<PlaygroundConfig[]>([defaultConfig()]);
  const [compareMode, setCompareMode] = useState(false);
  const [results, setResults] = useState<Record<string, { output: string; latency: number; tokens: number; cost: number } | null>>({});
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savedOutput, setSavedOutput] = useState("");

  const updateConfig = (id: string, update: PlaygroundConfig) => {
    setConfigs((prev) => prev.map((c) => (c.id === id ? update : c)));
  };

  const addConfig = () => {
    setConfigs((prev) => [...prev, defaultConfig()]);
  };

  const removeConfig = (id: string) => {
    setConfigs((prev) => prev.filter((c) => c.id !== id));
  };

  const handleRun = async () => {
    for (const config of configs) {
      setRunning((prev) => ({ ...prev, [config.id]: true }));
      setResults((prev) => ({ ...prev, [config.id]: null }));
      try {
        const result = await onRun(config);
        setResults((prev) => ({ ...prev, [config.id]: result }));
      } catch {
        setResults((prev) => ({
          ...prev,
          [config.id]: { output: "Error running prompt", latency: 0, tokens: 0, cost: 0 },
        }));
      } finally {
        setRunning((prev) => ({ ...prev, [config.id]: false }));
      }
    }
  };

  const visibleConfigs = compareMode ? configs : [configs[0]];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-text-primary">Playground</h3>
          <div className="flex items-center gap-2">
            <Label className="text-xs cursor-pointer">Compare Mode</Label>
            <Switch checked={compareMode} onCheckedChange={setCompareMode} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {compareMode && (
            <Button variant="outline" size="sm" onClick={addConfig}>
              <Plus className="h-4 w-4 mr-1" />
              Add Config
            </Button>
          )}
          <Button size="sm" onClick={handleRun}>
            <Play className="h-4 w-4 mr-1" />
            Run
          </Button>
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save as Prompt</DialogTitle>
                <DialogDescription>
                  Save the current configuration as a reusable prompt template.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label>Config to save</Label>
                  <Select
                    value={Object.keys(results).find((k) => results[k]) || configs[0]?.id}
                    onValueChange={(v) => setSavedOutput(results[v]?.output ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {configs.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.provider} / {c.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => { onSave(configs[0]); setSaveDialogOpen(false); }}>
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className={cn("flex gap-4", compareMode ? "flex-row overflow-x-auto" : "flex-col")}>
        <AnimatePresence mode="popLayout">
          {visibleConfigs.map((config) => (
            <motion.div
              key={config.id}
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={compareMode ? "min-w-[400px] max-w-[500px]" : "w-full"}
            >
              <ConfigPanel
                config={config}
                onChange={(updated) => updateConfig(config.id, updated)}
                onRemove={compareMode ? () => removeConfig(config.id) : undefined}
                removable={compareMode && configs.length > 1}
                result={results[config.id]}
                running={running[config.id]}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
