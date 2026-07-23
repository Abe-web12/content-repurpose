"use client";

import Link from "next/link";
import { Gift, Users, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useReferralCode } from "@/hooks/use-referrals";

export function ReferralEarningsWidget() {
  const { code, loading } = useReferralCode();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Gift className="h-4 w-4 text-brand-600" />
          Referral Program
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : code ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-brand-50 border border-brand-200 px-3 py-2">
              <p className="text-xs text-text-muted mb-1">Your referral code</p>
              <p className="text-lg font-mono font-bold text-brand-700 tracking-wider">{code}</p>
            </div>
            <Link
              href="/referrals"
              className="flex items-center justify-between text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              <span>View referral dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <Link href="/referrals" className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium">
            <Users className="h-4 w-4" />
            <span>Get your referral link</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
        <p className="mt-2 text-xs text-text-muted">Invite friends and earn credits!</p>
      </CardContent>
    </Card>
  );
}
