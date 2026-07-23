"use client";

import { ArrowUpRight, ArrowDownRight, Clock, Gift, RefreshCw, Plus, Minus, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const SOURCE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PURCHASED: { label: "Purchase", color: "text-emerald-600 bg-emerald-50", icon: Plus },
  USAGE: { label: "Usage", color: "text-blue-600 bg-blue-50", icon: Minus },
  BONUS: { label: "Bonus", color: "text-purple-600 bg-purple-50", icon: Gift },
  REFERRAL: { label: "Referral", color: "text-amber-600 bg-amber-50", icon: RefreshCw },
  ADDON: { label: "Addon", color: "text-indigo-600 bg-indigo-50", icon: Plus },
  PROMOTION: { label: "Promotion", color: "text-pink-600 bg-pink-50", icon: BadgeCheck },
  REFUND: { label: "Refund", color: "text-teal-600 bg-teal-50", icon: RefreshCw },
  EXPIRED: { label: "Expired", color: "text-red-600 bg-red-50", icon: Clock },
  ADMIN: { label: "Adjustment", color: "text-gray-600 bg-gray-50", icon: RefreshCw },
};

interface CreditTxnRowProps {
  amount: number;
  balanceAfter: number;
  source: string;
  description: string | null;
  reference: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export function CreditTransactionRow({ amount, balanceAfter, source, description, createdAt }: CreditTxnRowProps) {
  const config = SOURCE_CONFIG[source] ?? { label: source, color: "text-gray-600 bg-gray-50", icon: RefreshCw };
  const Icon = config.icon;
  const isCredit = amount > 0;

  return (
    <div className="flex items-center gap-4 rounded-lg border border-surface-2 p-4 transition-colors hover:bg-surface-1">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", config.color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{config.label}</p>
        {description && (
          <p className="truncate text-xs text-text-muted">{description}</p>
        )}
      </div>
      <div className="text-right">
        <p className={cn("text-sm font-semibold", isCredit ? "text-emerald-600" : "text-red-600")}>
          {isCredit ? "+" : ""}{amount}
        </p>
        <p className="text-xs text-text-muted">
          {new Date(createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
