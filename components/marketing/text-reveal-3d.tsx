"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "p" | "span";

interface TextReveal3DProps {
  children: ReactNode;
  as?: HeadingTag;
  className?: string;
  delay?: number;
  stagger?: number;
  once?: boolean;
  threshold?: number;
}

export function TextReveal3D({
  children,
  as = "h1",
  className,
  delay = 0,
  stagger = 0.04,
  once = true,
  threshold = 0.2,
}: TextReveal3DProps) {
  const text = typeof children === "string" ? children : "";
  if (!text) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const words = text.split(" ");
  const Tag = as;

  return (
    <Tag className={cn("perspective-1000", className)} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} className="inline-block">
          <motion.span
            initial={{ rotateX: -90, opacity: 0, y: 30, z: -50 }}
            whileInView={{ rotateX: 0, opacity: 1, y: 0, z: 0 }}
            viewport={{ once, margin: `${-threshold * 100}px` }}
            transition={{
              duration: 0.8,
              delay: delay + i * stagger,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="inline-block"
            style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 && "\u00A0"}
        </span>
      ))}
    </Tag>
  );
}
