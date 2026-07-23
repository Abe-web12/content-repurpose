"use client";

import { formatTwitterThread } from "@/lib/utils/format-output";

interface OutputTwitterProps {
  content: string;
  streaming?: boolean;
}

export function OutputTwitter({ content, streaming }: OutputTwitterProps) {
  if (streaming) {
    return (
      <div className="rounded-xl border border-surface-3 bg-white p-5">
        <div className="flex gap-3">
          <div className="h-9 w-9 shrink-0 rounded-full bg-surface-2" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">You</span>
              <span className="text-xs text-text-muted">@you</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
              {content}
              <span className="inline-block h-4 w-0.5 animate-pulse bg-brand-600" />
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tweets = formatTwitterThread(content);

  if (tweets.length === 0) return null;

  return (
    <div className="space-y-3">
      {tweets.map((tweet, index) => (
        <div key={index} className="relative rounded-xl border border-surface-3 bg-white p-4">
          <div className="flex gap-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-surface-2" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">You</span>
                <span className="text-xs text-text-muted">@you • now</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-text-primary">{tweet}</p>
              <span className="mt-2 inline-block text-xs text-text-muted">{tweet.length}/280</span>
            </div>
          </div>
          <span className="absolute right-3 top-3 text-xs font-medium text-text-muted">
            {index + 1}/{tweets.length}
          </span>
        </div>
      ))}
    </div>
  );
}
