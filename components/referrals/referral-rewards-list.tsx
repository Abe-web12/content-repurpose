"use client";

import { Gift, DollarSign, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Reward {
  id: string;
  creditAmount: number;
  cashAmount: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

interface ReferralRewardsListProps {
  rewards: Reward[];
  loading?: boolean;
}

export function ReferralRewardsList({ rewards, loading }: ReferralRewardsListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Rewards</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const pendingRewards = rewards.filter((r) => r.status === "pending");
  const paidRewards = rewards.filter((r) => r.status === "paid");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            Pending Rewards ({pendingRewards.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRewards.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">No pending rewards</p>
          ) : (
            <div className="space-y-2">
              {pendingRewards.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    {r.creditAmount > 0 ? <Gift className="h-4 w-4 text-brand-600" /> : <DollarSign className="h-4 w-4 text-green-600" />}
                    <span className="text-sm">
                      {r.creditAmount > 0 ? `${r.creditAmount} credits` : `$${r.cashAmount.toFixed(2)}`}
                    </span>
                  </div>
                  <Badge variant="outline">{new Date(r.createdAt).toLocaleDateString()}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Paid Rewards ({paidRewards.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paidRewards.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">No paid rewards yet</p>
          ) : (
            <div className="space-y-2">
              {paidRewards.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    {r.creditAmount > 0 ? <Gift className="h-4 w-4 text-brand-600" /> : <DollarSign className="h-4 w-4 text-green-600" />}
                    <span className="text-sm">
                      {r.creditAmount > 0 ? `${r.creditAmount} credits` : `$${r.cashAmount.toFixed(2)}`}
                    </span>
                  </div>
                  <span className="text-xs text-text-muted">
                    {r.paidAt ? new Date(r.paidAt).toLocaleDateString() : new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
