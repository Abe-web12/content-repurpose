"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface MousePosition {
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
}

const CursorContext = createContext<MousePosition>({
  x: 0,
  y: 0,
  normalizedX: 0,
  normalizedY: 0,
});

export function CursorProvider({ children }: { children: ReactNode }) {
  const [mouse, setMouse] = useState<MousePosition>({
    x: 0,
    y: 0,
    normalizedX: 0,
    normalizedY: 0,
  });

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      setMouse({
        x: e.clientX,
        y: e.clientY,
        normalizedX: (e.clientX / window.innerWidth) * 2 - 1,
        normalizedY: -(e.clientY / window.innerHeight) * 2 + 1,
      });
    }

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return <CursorContext.Provider value={mouse}>{children}</CursorContext.Provider>;
}

export function useCursor() {
  return useContext(CursorContext);
}
