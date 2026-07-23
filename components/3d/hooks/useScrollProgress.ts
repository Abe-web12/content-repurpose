import { useRef, useEffect, useCallback, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { COLOR_CONFIGS, SCROLL } from "../constants";
import type { ColorConfig } from "../types";

gsap.registerPlugin(ScrollTrigger);

interface ScrollProgressResult {
  progressRef: { current: number };
  currentConfig: ColorConfig;
  cleanup: () => void;
}

const initialConfig: ColorConfig = { ...COLOR_CONFIGS[0], id: "", rimColor: COLOR_CONFIGS[0].rimColor };

export function useScrollProgress(): ScrollProgressResult {
  const progressRef = useRef(0);
  const [currentConfig, setCurrentConfig] = useState<ColorConfig>(COLOR_CONFIGS[0]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          progressRef.current = self.progress;
        },
      });
    });

    return () => ctx.revert();
  }, []);

  return { progressRef, currentConfig, cleanup: () => {} };
}

interface SectionColorHandlers {
  onSectionEnter?: (config: ColorConfig) => void;
}

export function useSectionColors(handlers?: SectionColorHandlers) {
  useEffect(() => {
    const ctx = gsap.context(() => {
      COLOR_CONFIGS.forEach(({ id, accent, bg, fogColor, rimColor }) => {
        const el = document.getElementById(id);
        if (!el) return;

        ScrollTrigger.create({
          trigger: el,
          start: SCROLL.SECTION_TRIGGER_START,
          end: SCROLL.SECTION_TRIGGER_END,
          onToggle: ({ isActive }) => {
            if (isActive) {
              gsap.to(document.documentElement, {
                "--section-accent": accent,
                "--section-bg": bg,
                duration: SCROLL.COLOR_TRANSITION_DURATION,
                ease: SCROLL.COLOR_EASE,
              });
              handlers?.onSectionEnter?.({ id, accent, bg, emissive: accent, fogColor, rimColor });
            }
          },
        });
      });
    });

    return () => ctx.revert();
  }, [handlers]);
}
