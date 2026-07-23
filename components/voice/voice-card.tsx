"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import type { VoiceProfile } from "@/lib/types/index";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { capitalize, formatRelativeTime } from "@/lib/utils";

interface VoiceCardProps {
  profile: VoiceProfile;
  onDelete: (id: string) => void;
}

export function VoiceCard({ profile, onDelete }: VoiceCardProps) {
  return (
    <div className="group rounded-xl border border-surface-3 bg-white p-5 transition-shadow hover:shadow-soft">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-text-primary">{profile.name}</h3>
          {profile.is_default && <Badge variant="default">Default</Badge>}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-md p-1.5 text-text-muted opacity-0 transition-opacity hover:bg-surface-1 hover:text-text-primary group-hover:opacity-100"
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/voice/${profile.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem destructive onSelect={() => onDelete(profile.id)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {profile.description && (
        <p className="mt-2 text-sm text-text-secondary line-clamp-2">
          {profile.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{capitalize(profile.tone)}</Badge>
        <span className="text-xs text-text-muted">
          {profile.example_posts.length} example{profile.example_posts.length !== 1 ? "s" : ""}
        </span>
      </div>

      <p className="mt-3 text-xs text-text-muted">
        Created {formatRelativeTime(profile.created_at)}
      </p>
    </div>
  );
}
