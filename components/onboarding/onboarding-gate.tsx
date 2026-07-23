"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/hooks/use-onboarding";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export function OnboardingGate() {
  const { completed, loading, skipOnboarding, completeOnboarding } = useOnboarding();
  const router = useRouter();

  if (loading) return null;
  if (completed) return null;

  return (
    <OnboardingWizard
      onComplete={() => {
        completeOnboarding();
        router.refresh();
      }}
      onSkip={() => {
        skipOnboarding();
        router.refresh();
      }}
    />
  );
}
