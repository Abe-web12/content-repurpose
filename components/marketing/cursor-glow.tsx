"use client";

import { useEffect, useState } from "react";
import { motion, useSpring } from "framer-motion";
import { useCursor } from "./cursor-tracker";

export function CursorGlow() {
  const { x, y } = useCursor();
  const [mounted, setMounted] = useState(false);

  const springX = useSpring(x, { stiffness: 80, damping: 25 });
  const springY = useSpring(y, { stiffness: 80, damping: 25 });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[5]">
      <motion.div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: springX, top: springY }}
      >
        <div
          className="h-48 w-48 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.6) 0%, rgba(139,92,246,0.2) 40%, transparent 70%)",
            filter: "blur(20px)",
          }}
        />
      </motion.div>
    </div>
  );
}
