"use client";

import { Mic2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VoiceProfile } from "@/lib/types/index";
import { capitalize } from "@/lib/utils";

interface VoiceSelectorProps {
  profiles: VoiceProfile[];
  selected: VoiceProfile | null;
  onChange: (profile: VoiceProfile | null) => void;
}

export function VoiceSelector({ profiles, selected, onChange }: VoiceSelectorProps) {
  function handleChange(value: string) {
    if (value === "none") {
      onChange(null);
      return;
    }
    const profile = profiles.find((p) => p.id === value);
    onChange(profile || null);
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
        <Mic2 className="h-4 w-4 text-text-muted" />
        Voice profile
      </label>

      <Select value={selected?.id || "none"} onValueChange={handleChange}>
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

      {profiles.length === 0 && (
        <p className="text-xs text-text-muted">
          No voice profiles yet. Create one in Voice Profiles to match your writing style.
        </p>
      )}
    </div>
  );
}
