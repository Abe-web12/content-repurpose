"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExamplePostInput } from "./example-post-input";
import { voiceProfileSchema } from "@/lib/validations/voice";
import type { VoiceProfile } from "@/lib/types/index";

const TONE_OPTIONS = [
  { value: "formal", label: "Formal", description: "Professional and structured" },
  { value: "casual", label: "Casual", description: "Relaxed and conversational" },
  { value: "witty", label: "Witty", description: "Clever and humorous" },
  { value: "authoritative", label: "Authoritative", description: "Expert and confident" },
  { value: "friendly", label: "Friendly", description: "Warm and approachable" },
] as const;

interface VoiceFormProps {
  initialData?: VoiceProfile | null;
  onSubmit: (data: any) => Promise<any>;
  submitLabel?: string;
}

export function VoiceForm({ initialData, onSubmit, submitLabel = "Save" }: VoiceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [tone, setTone] = useState<string>(initialData?.tone || "formal");
  const [examplePosts, setExamplePosts] = useState<string[]>(
    initialData?.example_posts?.length ? initialData.example_posts : [""]
  );
  const [isDefault, setIsDefault] = useState(initialData?.is_default || false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const filteredExamples = examplePosts.filter((p) => p.trim().length > 0);

    const data = {
      name: name.trim(),
      description: description.trim() || null,
      tone,
      example_posts: filteredExamples,
      is_default: isDefault,
    };

    const validation = voiceProfileSchema.safeParse(data);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      const flat: Record<string, string> = {};
      for (const [key, msgs] of Object.entries(fieldErrors)) {
        if (msgs?.[0]) flat[key] = msgs[0];
      }
      setErrors(flat);
      return;
    }

    setLoading(true);
    const result = await onSubmit(validation.data);
    setLoading(false);

    if (result) {
      router.push("/voice");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-medium text-text-primary">
          Profile name
        </label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Professional Founder, Casual Marketer"
          error={errors.name}
        />
      </div>

      <div>
        <label htmlFor="desc" className="mb-2 block text-sm font-medium text-text-primary">
          Style description <span className="text-text-muted">(optional)</span>
        </label>
        <Textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe how you write: direct, story-driven, data-heavy, contrarian..."
          className="min-h-[80px]"
        />
        {errors.description && <p className="mt-1.5 text-xs text-red-600">{errors.description}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-text-primary">Tone</label>
        <Select value={tone} onValueChange={setTone}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a tone" />
          </SelectTrigger>
          <SelectContent>
            {TONE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label} — {option.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.tone && <p className="mt-1.5 text-xs text-red-600">{errors.tone}</p>}
      </div>

      <ExamplePostInput
        examples={examplePosts}
        onChange={setExamplePosts}
        error={errors.example_posts}
      />

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="h-4 w-4 rounded border-surface-3 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm text-text-primary">Set as default voice profile</span>
      </label>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/voice")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
