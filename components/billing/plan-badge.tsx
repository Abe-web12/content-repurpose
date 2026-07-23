"use client";

import { Badge } from "@/components/ui/badge";
import { useUsage } from "@/components/providers/usage-provider";
import { PLANS } from "@/lib/constants/plans";

export function PlanBadge() {
  const { plan } = useUsage();
  const planData = PLANS[plan];

  if (!planData) return null;

  const variant = plan === "pro" ? "pro" : plan === "starter" ? "success" : "secondary";

  return <Badge variant={variant}>{planData.name}</Badge>;
}
