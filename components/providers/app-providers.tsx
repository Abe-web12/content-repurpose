"use client";

import { ReactNode } from "react";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";

export function AppProviders({
  children,
  showOnboarding,
}: {
  children: ReactNode;
  showOnboarding?: boolean;
}) {
  return (
    <>
      {showOnboarding && <OnboardingGate />}
      {children}
    </>
  );
}
