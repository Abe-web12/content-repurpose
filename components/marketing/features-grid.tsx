"use client";

import { motion } from "framer-motion";
import { Layers, Linkedin, Mic2, Sparkles, Twitter, Zap } from "lucide-react";
import { TextReveal3D } from "@/components/marketing/text-reveal-3d";

const features = [
  { icon: Sparkles, title: "Multi-step AI pipeline", description: "Extract, analyze, then generate. Not a single-prompt wrapper." },
  { icon: Mic2, title: "Voice matching", description: "Paste your writing examples. Every output matches your tone." },
  { icon: Linkedin, title: "LinkedIn-native formatting", description: "Hook-first posts, carousel slides, engagement-optimized structure." },
  { icon: Twitter, title: "Thread generation", description: "5-9 tweets, each under 280 chars, each standalone-worthy." },
  { icon: Layers, title: "Carousel content", description: "Slide-by-slide copy for PDF carousels. Headlines and body per slide." },
  { icon: Zap, title: "Chrome extension", description: "Repurpose any article while reading it. One click from your browser." },
];

export function FeaturesGrid() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 sm:py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-indigo-300">Features</p>
        <TextReveal3D
          as="h2"
          className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl"
          delay={0.1}
          stagger={0.05}
          threshold={0.1}
        >
          Built for people who publish weekly.
        </TextReveal3D>
      </motion.div>

      <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 transition-all duration-500 hover:border-white/20 hover:bg-white/[0.06] hover:shadow-soft"
          >
            <div
              className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-brand-500 transition-all duration-500 group-hover:bg-white/20"
            >
              <feature.icon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
