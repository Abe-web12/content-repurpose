"use client";

import { useRef, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { CanvasErrorBoundary, ScrollScene, usePerformanceLevel, useScrollProgress, useSectionColors } from "@/components/3d";

function LoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0a0a1a]">
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-t-indigo-400 border-r-indigo-500/40 border-b-indigo-500/20 border-l-indigo-500/30 animate-spin" />
          <div className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
        </div>
        <p className="text-sm font-medium tracking-wider text-indigo-300/60 uppercase">
          Initializing 3D Scene
        </p>
      </div>
    </div>
  );
}

export function ScrollytellingScene() {
  const performance = usePerformanceLevel();
  const { progressRef } = useScrollProgress();

  useSectionColors();

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      <div className="pointer-events-auto h-full w-full">
        <CanvasErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <Canvas
              camera={{ position: [0, 0, 5.5], fov: 45 }}
              dpr={performance.dpr}
              gl={{
                antialias: true,
                alpha: true,
                powerPreference: "high-performance",
                ...(performance.prefersReducedMotion ? { stencil: false, depth: true } : {}),
              }}
              style={{ background: "transparent" }}
            >
              <ScrollScene progressRef={progressRef} performance={performance} />
            </Canvas>
          </Suspense>
        </CanvasErrorBoundary>
      </div>
    </div>
  );
}
