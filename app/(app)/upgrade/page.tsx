"use client";

import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PricingCards } from "@/components/billing/pricing-cards";

export default function UpgradePage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Upgrade"
        description="Choose the plan that matches your publishing pace."
      />

      <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-800">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
          <div>
            <p className="font-semibold">Unlock more generations</p>
            <p className="mt-1 text-brand-700">
              Upgrade to access higher generation limits, more voice profiles,
              and advanced features like LinkedIn Carousels and priority generation speed.
            </p>
          </div>
        </div>
      </div>

      <PricingCards />
    </div>
  );
}
