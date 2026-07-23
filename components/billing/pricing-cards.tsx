"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PLANS, type PlanKey } from "@/lib/constants/plans";
import { useUsage } from "@/components/providers/usage-provider";
import { showError } from "@/components/ui/toast";

export function PricingCards() {
  const { plan: currentPlan } = useUsage();
  const [loading, setLoading] = useState<PlanKey | null>(null);

  async function handleCheckout(planKey: PlanKey) {
    setLoading(planKey);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });

      const json = await response.json();

      if (!response.ok) {
        showError(json.error || "Checkout failed");
        return;
      }

      if (json.url) {
        window.location.href = json.url;
      }
    } catch {
      showError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  const planKeys: PlanKey[] = ["free", "starter", "pro"];

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {planKeys.map((planKey) => {
        const plan = PLANS[planKey];
        const isCurrent = currentPlan === planKey;
        const isLoading = loading === planKey;

        return (
          <Card
            key={planKey}
            className={cn(
              "relative flex flex-col transition-shadow hover:shadow-lg",
              plan.popular && "border-brand-500 shadow-md ring-1 ring-brand-500"
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-block rounded-full bg-brand-600 px-4 py-1 text-xs font-semibold text-white shadow-sm">
                  Most popular
                </span>
              </div>
            )}

            <CardHeader className="p-6 pb-0">
              <h3 className="text-xl font-bold text-text-primary">{plan.name}</h3>
              <div className="mt-2">
                <span className="text-4xl font-bold text-text-primary">{plan.priceLabel}</span>
                {plan.price > 0 && (
                  <span className="ml-1 text-sm text-text-muted">/month</span>
                )}
              </div>
              <p className="mt-2 text-sm text-text-secondary">{plan.generationsLabel}</p>
            </CardHeader>

            <CardContent className="flex-1 p-6">
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-text-primary">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="p-6 pt-0">
              {isCurrent ? (
                <Button variant="outline" className="w-full" disabled>
                  Current plan
                </Button>
              ) : planKey === "free" ? (
                <Button variant="outline" className="w-full" disabled>
                  Already free
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleCheckout(planKey)}
                  loading={isLoading}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    `Upgrade to ${plan.name}`
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
