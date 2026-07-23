"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { TextReveal3D } from "@/components/marketing/text-reveal-3d";

export function Hero() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 150, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(springY, [-0.5, 0.5], [3, -3]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-3, 3]);

  function handleMouseMove(e: React.MouseEvent) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  }

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-[92vh] overflow-hidden bg-transparent"
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/4 top-1/4 h-[500px] w-[500px] rounded-full blur-[120px]"
          style={{ background: "rgba(var(--section-bg, 99,102,241), 0.15)" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full blur-[100px]"
          style={{ background: "rgba(var(--section-bg, 139,92,246), 0.1)" }}
        />
      </div>

      <div className="relative mx-auto flex min-h-[92vh] max-w-6xl flex-col items-center justify-center px-5 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-indigo-300 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse-slow" />
            AI-powered content repurposing
          </p>
        </motion.div>

        <motion.div
          style={isDesktop ? { rotateX, rotateY, transformPerspective: 1200 } : undefined}
          className="max-w-5xl"
        >
          <TextReveal3D
            as="h1"
            className="font-display text-5xl font-extrabold leading-[1.05] tracking-[-0.04em] text-white sm:text-6xl lg:text-8xl"
            delay={0.1}
            stagger={0.06}
          >
            One source. Every channel.
          </TextReveal3D>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-white/60 sm:text-xl"
        >
          Turn YouTube videos, blog posts, and podcasts into LinkedIn posts,
          carousels, and X threads that sound exactly like you.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <Button size="xl" asChild className="bg-indigo-500 hover:bg-indigo-400 text-white border-0">
            <Link href="/signup">
              Start free (3 generations)
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            variant="outline"
            size="xl"
            asChild
            className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:border-white/30"
          >
            <Link href="/pricing">See pricing</Link>
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-6 text-sm text-white/40"
        >
          No credit card required. Free forever on the free plan.
        </motion.p>
      </div>
    </section>
  );
}
