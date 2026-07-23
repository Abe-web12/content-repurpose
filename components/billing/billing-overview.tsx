"use client";

import { useState } from "react";
import { CreditCard, ExternalLink, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PlanBadge } from "@/components/billing/plan-badge";
import { PLANS } from "@/lib/constants/plans";
import { showError } from "@/components/ui/toast";

interface BillingOverviewProps {
  plan: string;
  generationsUsed: number;
  generationsLimit: number;
}

export function BillingOverview({ plan, generationsUsed, generationsLimit }: BillingOverviewProps) {
  const [portalLoading, setPortalLoading] = useState(false);

  const planData = PLANS[plan as keyof typeof PLANS];
  const unlimited = generationsLimit === -1;
  const percentage = unlimited ? 0 : Math.min(100, Math.round((generationsUsed / generationsLimit) * 100));
  const isNearLimit = !unlimited && percentage >= 80;
  const isAtLimit = !unlimited && percentage >= 100;

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        showError(json.error || "Failed to open portal");
        return;
      }
      if (json.url) window.location.href = json.url;
    } catch {
      showError("Something went wrong");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-text-muted" />
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your subscription and usage details.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-surface-2 p-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Plan</p>
              <PlanBadge />
              <p className="mt-1 text-xs text-text-muted">
                {planData?.priceLabel || "Free"} — {planData?.generationsLabel || "3 generations"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={openPortal}
              disabled={portalLoading}
              className="gap-2"
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              {plan === "free" ? "Upgrade" : "Manage"}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">
                {unlimited ? "Generations" : "Monthly Generations"}
              </span>
              <span className="text-sm text-text-muted">
                {unlimited ? "Unlimited" : `${generationsUsed} / ${generationsLimit}`}
              </span>
            </div>
            {!unlimited && (
              <>
                <Progress
                  value={percentage}
                  className="h-2"
                  indicatorClassName={
                    isAtLimit ? "bg-red-500" : isNearLimit ? "bg-amber-500" : undefined
                  }
                />
                <div className="flex items-center gap-2">
                  {isAtLimit ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-xs text-red-600">Limit reached. Upgrade for more.</span>
                    </>
                  ) : isNearLimit ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="text-xs text-amber-600">
                        {generationsLimit - generationsUsed} generation{(generationsLimit - generationsUsed) !== 1 ? "s" : ""} remaining
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs text-emerald-600">
                        {generationsLimit - generationsUsed} generation{(generationsLimit - generationsUsed) !== 1 ? "s" : ""} remaining
                      </span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="rounded-lg bg-brand-50 p-4">
            <p className="text-xs font-medium text-brand-700">Need more generations?</p>
            <p className="mt-1 text-xs text-brand-600">
              Upgrade to Starter ($19/mo) for 30 generations/month or Pro ($49/mo) for unlimited.
            </p>
            <Button size="sm" className="mt-3" asChild>
              <a href="/upgrade">View plans</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
