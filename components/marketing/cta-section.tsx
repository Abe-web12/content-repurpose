"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { TextReveal3D } from "@/components/marketing/text-reveal-3d";

export function CtaSection() {
  return (
    <section className="border-t border-white/10 bg-white/[0.02] backdrop-blur-xl">
      <div className="mx-auto max-w-4xl px-5 py-24 text-center sm:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <TextReveal3D
            as="h2"
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
            delay={0.1}
            stagger={0.05}
            threshold={0.1}
          >
            Stop creating from scratch. Start repurposing.
          </TextReveal3D>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mx-auto mt-4 max-w-xl text-lg text-slate-200"
        >
          Three free generations. No credit card. See the quality for yourself.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <Button size="xl" className="mt-8" asChild>
            <Link href="/signup">
              Create free account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
