"use client";

import dynamic from "next/dynamic";
import { type ReactNode } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { DynamicBackground } from "@/components/marketing/dynamic-background";
import { CursorGlow } from "@/components/marketing/cursor-glow";

const ScrollytellingScene = dynamic(
  () => import("@/components/marketing/scrollytelling-scene").then((m) => m.ScrollytellingScene),
  { ssr: false }
);

export function BackgroundLayer({ children }: { children: ReactNode }) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <>
        <ScrollytellingScene />
        <CursorGlow />
        {children}
      </>
    );
  }

  return <DynamicBackground>{children}</DynamicBackground>;
}
