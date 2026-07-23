"use client";

import { useState, useCallback, useEffect } from "react";

const STEPS = ["welcome", "voice", "brand-kit", "generate", "done"] as const;
type OnboardingStep = (typeof STEPS)[number];

export function useOnboarding() {
  const [completed, setCompleted] = useState(true);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/user/onboarding");
      const json = await res.json();
      if (res.ok) {
        setCompleted(json.data.completed);
        setCurrentStep(json.data.step || "welcome");
      }
    } catch {
      setCompleted(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const updateStep = useCallback(async (step: OnboardingStep) => {
    setCurrentStep(step);
    await fetch("/api/user/onboarding", {
      method: "PATCH",
      body: JSON.stringify({ step }),
    });
  }, []);

  const completeOnboarding = useCallback(async () => {
    setCompleted(true);
    await fetch("/api/user/onboarding", {
      method: "PATCH",
      body: JSON.stringify({ completed: true }),
    });
  }, []);

  const nextStep = useCallback(() => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) {
      updateStep(STEPS[idx + 1]);
    } else {
      completeOnboarding();
    }
  }, [currentStep, updateStep, completeOnboarding]);

  const skipOnboarding = useCallback(async () => {
    await completeOnboarding();
  }, [completeOnboarding]);

  return {
    completed,
    currentStep,
    loading,
    nextStep,
    skipOnboarding,
    updateStep,
    completeOnboarding,
  };
}
