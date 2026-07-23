"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { useUsage } from "@/components/providers/usage-provider";
import { Progress } from "@/components/ui/progress";

export function UsageBadge() {
  const { plan, generationsUsed, generationsLimit, remaining, percentage, canUserGenerate } = useUsage();
  const unlimited = generationsLimit === -1;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-indigo-400" />
          <span className="text-sm font-semibold capitalize text-gray-200">{plan}</span>
        </div>
        {!unlimited && <span className="text-xs font-medium text-gray-500">{generationsUsed}/{generationsLimit}</span>}
      </div>

      {!unlimited && <Progress value={percentage} className="mt-3 h-1.5" indicatorClassName={!canUserGenerate ? "bg-red-500" : percentage > 80 ? "bg-amber-500" : undefined} />}
      {!unlimited && <p className="mt-2 text-xs text-gray-400">{remaining} generation{remaining !== 1 ? "s" : ""} remaining</p>}
      {plan === "free" && <Link href="/upgrade" className="mt-3 inline-block text-xs font-semibold text-indigo-400 hover:text-indigo-300">Upgrade plan →</Link>}
    </div>
  );
}
