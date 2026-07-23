"use client";

import { Plus, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ExamplePostInputProps {
  examples: string[];
  onChange: (examples: string[]) => void;
  maxExamples?: number;
  error?: string;
}

export function ExamplePostInput({
  examples,
  onChange,
  maxExamples = 5,
  error,
}: ExamplePostInputProps) {
  function addExample() {
    if (examples.length < maxExamples) {
      onChange([...examples, ""]);
    }
  }

  function updateExample(index: number, value: string) {
    const updated = [...examples];
    updated[index] = value;
    onChange(updated);
  }

  function removeExample(index: number) {
    onChange(examples.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text-primary">
          Writing examples
        </label>
        <span className="text-xs text-text-muted">
          {examples.length}/{maxExamples}
        </span>
      </div>

      <p className="text-xs text-text-secondary">
        Paste 1-5 examples of your real writing (LinkedIn posts, tweets, paragraphs). The AI matches this style.
      </p>

      {examples.map((example, index) => (
        <div key={index} className="relative">
          <Textarea
            value={example}
            onChange={(e) => updateExample(index, e.target.value)}
            placeholder={`Example ${index + 1}: Paste a real post or paragraph you've written...`}
            className="min-h-[100px] pr-10"
          />
          {examples.length > 1 && (
            <button
              type="button"
              onClick={() => removeExample(index)}
              className="absolute right-2 top-2 rounded p-1 text-text-muted hover:bg-red-50 hover:text-red-600"
              aria-label="Remove example"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}

      {examples.length < maxExamples && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addExample}
          className="w-full"
        >
          <Plus className="h-4 w-4" />
          Add another example
        </Button>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
