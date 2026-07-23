"use client";

import { Trophy, Medal, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardEntry {
  userId: string;
  name: string;
  totalReferrals: number;
  convertedCount: number;
  totalRevenue: number;
  rank: number;
}

interface ReferralLeaderboardProps {
  entries: LeaderboardEntry[];
  loading?: boolean;
  currentUserId?: string;
}

const rankIcons: Record<number, any> = {
  1: Trophy,
  2: Medal,
  3: Award,
};

const rankColors: Record<number, string> = {
  1: "text-yellow-500",
  2: "text-gray-400",
  3: "text-amber-600",
};

export function ReferralLeaderboard({ entries, loading, currentUserId }: ReferralLeaderboardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-32" /><Skeleton className="h-3 w-48" /></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Referrers
        </CardTitle>
        <CardDescription>Leading referrers this month</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {entries.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">No referrals yet. Be the first!</p>
        ) : (
          entries.map((entry) => {
            const RankIcon = rankIcons[entry.rank];
            const isCurrentUser = entry.userId === currentUserId;

            return (
              <div
                key={entry.userId}
                className={`flex items-center justify-between py-2.5 px-2 rounded-lg transition-colors ${
                  isCurrentUser ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-6 h-6 shrink-0">
                    {RankIcon ? (
                      <RankIcon className={`h-5 w-5 ${rankColors[entry.rank]}`} />
                    ) : (
                      <span className="text-xs font-mono text-text-muted">{entry.rank}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isCurrentUser ? "text-brand-700" : "text-text-primary"}`}>
                      {entry.name}
                      {isCurrentUser && <span className="ml-1.5 text-xs text-brand-500">(you)</span>}
                    </p>
                    <p className="text-xs text-text-muted">{entry.convertedCount} conversions</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-semibold text-text-primary">{entry.totalReferrals}</p>
                  <p className="text-xs text-text-muted">${entry.totalRevenue.toFixed(0)}</p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
