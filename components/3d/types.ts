import * as THREE from "three";

export interface ProgressRef {
  current: number;
}

export interface PerformanceLevel {
  isDesktop: boolean;
  isTablet: boolean;
  isMobile: boolean;
  dpr: [number, number];
  particleMultiplier: number;
  sparkleCount: number;
  shadowOpacity: number;
  prefersReducedMotion: boolean;
}

export interface ColorConfig {
  id: string;
  accent: string;
  bg: string;
  emissive: string;
  fogColor: string;
  rimColor: string;
}

export type FragmentGeometryType = "box" | "flat" | "tube";

export function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  );
}

export function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
