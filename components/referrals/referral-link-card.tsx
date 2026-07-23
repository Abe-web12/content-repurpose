"use client";

import { useState } from "react";
import { Copy, Share2, Check, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ReferralLinkCardProps {
  code: string | null;
  loading?: boolean;
}

export function ReferralLinkCard({ code, loading }: ReferralLinkCardProps) {
  const [copied, setCopied] = useState(false);

  const referralLink = code ? `${window.location.origin}/signup?ref=${code}` : "";
  const shareText = code ? `Join me on RepurposeAI! Use my referral code: ${code}` : "";

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    if (!referralLink || !navigator.share) return;
    try {
      await navigator.share({ title: "RepurposeAI", text: shareText, url: referralLink });
    } catch {}
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-3" />
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Your Referral Link</CardTitle>
        <CardDescription>Share this link with friends to earn rewards</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
          <code className="flex-1 text-sm font-mono text-brand-600 truncate">{referralLink || "Loading..."}</code>
          <Button variant="ghost" size="icon" onClick={handleCopy} className="shrink-0" title="Copy link">
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCopy} className="flex-1 gap-2">
            <Copy className="h-4 w-4" />
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          {typeof navigator.share === "function" && (
            <Button variant="outline" onClick={handleShare} className="gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          )}
          <Button variant="outline" asChild className="gap-2">
            <a href={`mailto:?subject=Join me on RepurposeAI&body=${encodeURIComponent(shareText + "\n\n" + referralLink)}`}>
              <ExternalLink className="h-4 w-4" />
              Email
            </a>
          </Button>
        </div>
        {code && (
          <p className="text-xs text-text-muted text-center">
            Code: <span className="font-mono font-semibold text-brand-600">{code}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
