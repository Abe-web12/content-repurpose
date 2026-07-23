"use client";

import { useState } from "react";
import { Coins, Download, Search, Filter, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/billing/stat-card";
import { CreditTransactionRow } from "@/components/billing/credit-transaction-row";
import { useBilling, useCreditHistory } from "@/hooks/use-billing";

const PAGE_SIZE = 20;

export default function CreditsPage() {
  const { balance, loading: billingLoading } = useBilling();
  const [page, setPage] = useState(0);
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const { data: history, loading: historyLoading } = useCreditHistory(PAGE_SIZE, page * PAGE_SIZE);

  const filtered = history?.transactions?.filter((txn) => {
    if (sourceFilter !== "all" && txn.source !== sourceFilter) return false;
    return true;
  }) ?? [];

  const totalPages = Math.ceil((history?.total ?? 0) / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Available Balance" value={balance?.available ?? 0} icon={Coins} loading={billingLoading} />
        <StatCard title="Reserved" value={balance?.reserved ?? 0} loading={billingLoading} />
        <StatCard title="Pending Expiration" value={balance?.pendingExpiration ?? 0} loading={billingLoading} />
        <StatCard title="Total Purchased" value={balance?.totalPurchased ?? 0} loading={billingLoading} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Credit History</CardTitle>
              <CardDescription>
                {history?.total ?? 0} total transactions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-36">
                  <Filter className="mr-2 h-3 w-3" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="PURCHASED">Purchased</SelectItem>
                  <SelectItem value="USAGE">Usage</SelectItem>
                  <SelectItem value="BONUS">Bonus</SelectItem>
                  <SelectItem value="REFERRAL">Referral</SelectItem>
                  <SelectItem value="ADDON">Addon</SelectItem>
                  <SelectItem value="PROMOTION">Promotion</SelectItem>
                  <SelectItem value="REFUND">Refund</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon-sm" title="Refresh" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Coins className="mx-auto mb-3 h-10 w-10 text-text-muted opacity-30" />
              <p className="text-sm font-medium text-text-primary">No transactions yet</p>
              <p className="text-xs text-text-muted">Your credit activity will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((txn) => (
                <CreditTransactionRow key={txn.id} {...txn} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-surface-2 pt-4">
              <p className="text-sm text-text-muted">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
