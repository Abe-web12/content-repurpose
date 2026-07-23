"use client";

interface OutputLinkedInProps {
  content: string;
  streaming?: boolean;
}

export function OutputLinkedIn({ content, streaming }: OutputLinkedInProps) {
  return (
    <div className="rounded-xl border border-surface-3 bg-white p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-surface-2" />
        <div>
          <p className="text-sm font-semibold text-text-primary">Your Name</p>
          <p className="text-xs text-text-muted">Your headline • 1m</p>
        </div>
      </div>

      <div className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
        {content}
        {streaming && <span className="inline-block h-4 w-0.5 animate-pulse bg-brand-600" />}
      </div>

      <div className="mt-4 flex items-center gap-6 border-t border-surface-3 pt-3">
        <span className="text-xs text-text-muted">👍 Like</span>
        <span className="text-xs text-text-muted">💬 Comment</span>
        <span className="text-xs text-text-muted">🔄 Repost</span>
        <span className="text-xs text-text-muted">✉️ Send</span>
      </div>
    </div>
  );
}
