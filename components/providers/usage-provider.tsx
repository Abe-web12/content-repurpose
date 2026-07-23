
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-provider";
import { PLANS, canGenerate, getRemainingGenerations, getUsagePercentage } from "@/lib/constants/plans";
import type { PlanKey } from "@/lib/constants/plans";

interface UsageContextValue {
  plan: PlanKey;
  generationsUsed: number;
  generationsLimit: number;
  remaining: number;
  percentage: number;
  canUserGenerate: boolean;
  incrementUsage: () => void;
  refreshUsage: () => Promise<void>;
}

const UsageContext = createContext<UsageContextValue>({
  plan: "free",
  generationsUsed: 0,
  generationsLimit: 3,
  remaining: 3,
  percentage: 0,
  canUserGenerate: true,
  incrementUsage: () => {},
  refreshUsage: async () => {},
});

export function UsageProvider({ children }: { children: ReactNode }) {
  const { profile, refreshProfile } = useAuth();
  const [generationsUsed, setGenerationsUsed] = useState(0);

  const plan = (profile?.plan || "free") as PlanKey;
  const generationsLimit = PLANS[plan]?.generations ?? Number(profile?.generationsLimit ?? profile?.generations_limit ?? 3);

  useEffect(() => {
    if (profile) {
      const raw = profile.generationsUsed ?? profile.generations_used;
      setGenerationsUsed(Number.isFinite(Number(raw)) ? Math.max(0, Number(raw)) : 0);
    }
  }, [profile]);

  const remaining = getRemainingGenerations(plan, generationsUsed);
  const percentage = getUsagePercentage(plan, generationsUsed);
  const canUserGenerate = canGenerate(plan, generationsUsed);

  const incrementUsage = useCallback(() => {
    setGenerationsUsed((prev) => prev + 1);
  }, []);

  const refreshUsage = useCallback(async () => {
    await refreshProfile();
  }, [refreshProfile]);

  return (
    <UsageContext.Provider
      value={{
        plan,
        generationsUsed,
        generationsLimit,
        remaining,
        percentage,
        canUserGenerate,
        incrementUsage,
        refreshUsage,
      }}
    >
      {children}
    </UsageContext.Provider>
  );
}

export function useUsage() {
  const context = useContext(UsageContext);
  if (!context) {
    throw new Error("useUsage must be used within a UsageProvider");
  }
  return context;
}