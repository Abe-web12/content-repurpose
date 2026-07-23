"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useScroll, useSpring } from "framer-motion";

interface ColorStop {
  offset: number;
  orbs: { color: string; size: number; x: number; y: number }[];
}

const COLOR_STOPS: ColorStop[] = [
  {
    offset: 0,
    orbs: [
      { color: "99,102,241", size: 600, x: 25, y: 25 },
      { color: "139,92,246", size: 500, x: 75, y: 70 },
      { color: "124,58,237", size: 400, x: 50, y: 50 },
    ],
  },
  {
    offset: 0.2,
    orbs: [
      { color: "139,92,246", size: 550, x: 30, y: 30 },
      { color: "236,72,153", size: 450, x: 70, y: 65 },
      { color: "168,85,247", size: 350, x: 45, y: 55 },
    ],
  },
  {
    offset: 0.4,
    orbs: [
      { color: "99,102,241", size: 500, x: 20, y: 35 },
      { color: "6,182,212", size: 550, x: 80, y: 60 },
      { color: "79,70,229", size: 400, x: 55, y: 45 },
    ],
  },
  {
    offset: 0.6,
    orbs: [
      { color: "129,140,248", size: 580, x: 25, y: 20 },
      { color: "139,92,246", size: 480, x: 75, y: 75 },
      { color: "99,102,241", size: 420, x: 50, y: 50 },
    ],
  },
  {
    offset: 0.8,
    orbs: [
      { color: "124,58,237", size: 520, x: 30, y: 30 },
      { color: "219,39,119", size: 500, x: 70, y: 65 },
      { color: "168,85,247", size: 380, x: 45, y: 55 },
    ],
  },
  {
    offset: 1,
    orbs: [
      { color: "99,102,241", size: 600, x: 25, y: 25 },
      { color: "79,70,229", size: 500, x: 75, y: 70 },
      { color: "139,92,246", size: 400, x: 50, y: 50 },
    ],
  },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateStop(
  stops: ColorStop[],
  progress: number
): ColorStop["orbs"] {
  const clamped = Math.max(0, Math.min(1, progress));
  let i = 0;
  for (let j = 0; j < stops.length - 1; j++) {
    if (clamped >= stops[j].offset && clamped <= stops[j + 1].offset) {
      i = j;
      break;
    }
  }
  if (i >= stops.length - 1) return stops[stops.length - 1].orbs;

  const a = stops[i];
  const b = stops[i + 1];
  const t = (clamped - a.offset) / (b.offset - a.offset);

  return a.orbs.map((orbA, idx) => {
    const orbB = b.orbs[idx];
    return {
      color: `${lerp(
        parseFloat(orbA.color.split(",")[0]),
        parseFloat(orbB.color.split(",")[0]),
        t
      )},${lerp(
        parseFloat(orbA.color.split(",")[1]),
        parseFloat(orbB.color.split(",")[1]),
        t
      )},${lerp(
        parseFloat(orbA.color.split(",")[2]),
        parseFloat(orbB.color.split(",")[2]),
        t
      )}`,
      size: lerp(orbA.size, orbB.size, t),
      x: lerp(orbA.x, orbB.x, t),
      y: lerp(orbA.y, orbB.y, t),
    };
  });
}

export function DynamicBackground({ children }: { children: ReactNode }) {
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 25,
  });
  const [orbs, setOrbs] = useState(COLOR_STOPS[0].orbs);

  useEffect(() => {
    const unsubscribe = smoothProgress.on("change", (v) => {
      setOrbs(interpolateStop(COLOR_STOPS, v));
    });
    return () => unsubscribe();
  }, [smoothProgress]);

  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {orbs.map((orb, i) => (
          <div
            key={i}
            className="absolute rounded-full will-change-transform"
            style={{
              width: orb.size,
              height: orb.size,
              left: `${orb.x}%`,
              top: `${orb.y}%`,
              transform: "translate(-50%, -50%)",
              background: `rgba(${orb.color},0.1)`,
              filter: "blur(120px)",
            }}
          />
        ))}
      </div>
      {children}
    </div>
  );
}
