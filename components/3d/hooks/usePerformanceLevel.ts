import { useState, useEffect } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { PERFORMANCE, SPARKLES, SHADOWS, PARTICLES } from "../constants";
import type { PerformanceLevel } from "../types";

function getPrefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function usePerformanceLevel(): PerformanceLevel {
  const isDesktop = useMediaQuery(`(min-width: ${PERFORMANCE.DESKTOP_BREAKPOINT}px)`);
  const isTablet = useMediaQuery(`(min-width: ${PERFORMANCE.TABLET_BREAKPOINT}px)`);
  const isMobile = !isTablet;
  const tablet = isTablet && !isDesktop;

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    setPrefersReducedMotion(getPrefersReducedMotion());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const dpr: [number, number] = tablet
    ? PERFORMANCE.TABLET_DPR
    : prefersReducedMotion
      ? [1, 1]
      : PERFORMANCE.DESKTOP_DPR;

  const particleMultiplier = tablet ? PERFORMANCE.LOW_END_PARTICLE_MULTIPLIER : 1;

  return {
    isDesktop,
    isTablet: tablet,
    isMobile,
    dpr,
    particleMultiplier,
    sparkleCount: tablet ? SPARKLES.TABLET_COUNT : prefersReducedMotion ? 0 : SPARKLES.DESKTOP_COUNT,
    shadowOpacity: tablet ? SHADOWS.TABLET_OPACITY : prefersReducedMotion ? 0 : SHADOWS.DESKTOP_OPACITY,
    prefersReducedMotion,
  };
}
