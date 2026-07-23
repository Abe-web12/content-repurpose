"use client";

import { useState, useCallback } from "react";
import { showError } from "@/components/ui/toast";

export interface PredictionPoint {
  date: string;
  actual?: number;
  predicted: number;
  lowerBound: number;
  upperBound: number;
}

export interface PredictionResult {
  metric: string;
  period: string;
  predictions: PredictionPoint[];
  confidence: number;
  trend: "up" | "down" | "stable";
  growth: number;
  metadata: { historicalAvg: number; predictedAvg: number; seasonalityFactor: number; rSquared: number };
}

export function usePredictions(
  organizationId?: string,
  metric: string = "mrr",
  days: "7" | "30" | "90" | "365" = "30"
) {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (organizationId) qs.set("organizationId", organizationId);
      qs.set("metric", metric);
      qs.set("days", days);
      const res = await fetch(`/api/analytics/predictions?${qs.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setPrediction(json.data);
      } else {
        showError(json.error || "Failed to load predictions");
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [organizationId, metric, days]);

  return { prediction, loading, refetch: fetchData };
}
