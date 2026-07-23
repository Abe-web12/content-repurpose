"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Code2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { extractVariables, estimateTokens, validateSyntax } from "@/lib/studio/prompt-engine";

interface PromptEditorProps {
  content: string;
  onChange: (content: string) => void;
  variables: string[];
  readOnly?: boolean;
  children?: React.ReactNode;
}

export function PromptEditor({ content, onChange, variables, readOnly, children }: PromptEditorProps) {
  const [showPreview, setShowPreview] = useState(false);

  const extractedVars = useMemo(() => extractVariables(content), [content]);
  const tokens = useMemo(() => estimateTokens(content), [content]);
  const syntax = useMemo(() => validateSyntax(content), [content]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          className={cn(
            "min-h-[200px] font-mono text-sm leading-relaxed",
            showPreview && "hidden"
          )}
          placeholder="Enter your prompt template... Use {{variable}} for dynamic values."
        />
        {showPreview && (
          <div className="min-h-[200px] w-full rounded-lg border border-surface-3 bg-white p-3 text-sm leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-text-muted" title="Token estimate">
          <Code2 className="h-3.5 w-3.5" />
          <span>~{tokens} tokens</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs" title="Syntax validation">
          {syntax.valid ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              <span className="text-green-600">Valid</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-red-600" />
              <span className="text-red-600" title={syntax.errors.join("; ")}>
                {syntax.errors.length} issue{syntax.errors.length > 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          {showPreview ? (
            <>
              <EyeOff className="h-3.5 w-3.5" /> Edit
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" /> Preview
            </>
          )}
        </button>

        {children}
      </div>

      {extractedVars.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-1.5"
        >
          <span className="text-xs text-text-muted mr-1">Variables:</span>
          {extractedVars.map((v) => {
            const isDefined = variables.includes(v);
            return (
              <Badge
                key={v}
                variant={isDefined ? "default" : "outline"}
                className={cn(
                  "text-xs font-mono",
                  !isDefined && "border-amber-300 text-amber-700"
                )}
              >
                {`{{${v}}}`}
                {!isDefined && (
                  <span className="ml-1 text-[10px]">(unset)</span>
                )}
              </Badge>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
