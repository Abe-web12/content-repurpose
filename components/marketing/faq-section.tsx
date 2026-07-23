"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TextReveal3D } from "@/components/marketing/text-reveal-3d";

const faqs = [
  { q: "What content sources can I use?", a: "YouTube videos (via transcript), any public blog/article URL, podcast URLs, or paste raw text directly. We support any content you want to repurpose." },
  { q: "How does voice matching work?", a: "You paste 1-5 examples of your real writing. Our AI analyzes your tone, structure, and style, then generates all content to match. The more examples, the better the match." },
  { q: "Is the free plan really free?", a: "Yes. You get 3 total generations with no time limit and no credit card required. When you need more, upgrade to Starter (30/month) or Pro (unlimited)." },
  { q: "Can I cancel anytime?", a: "Absolutely. Cancel from your Settings page anytime. You keep access through the end of your billing period." },
  { q: "What makes this different from ChatGPT?", a: "Three things: multi-step pipeline (extract, analyze, then generate), voice matching from your real writing samples, and platform-specific formatting (LinkedIn hooks, tweet character limits, carousel slides)." },
  { q: "Do you store my content?", a: "Your generations are stored in your account so you can access history. Source content is processed and discarded. You can delete any generation anytime." },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="mx-auto max-w-3xl px-5 py-24 sm:py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <TextReveal3D
          as="h2"
          className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
          delay={0.1}
          stagger={0.05}
          threshold={0.1}
        >
          Common questions
        </TextReveal3D>
      </motion.div>

      <div className="mt-12 space-y-3">
        {faqs.map((faq, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl transition-all duration-500 hover:border-white/20"
          >
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
            >
              <span className="text-sm font-semibold text-white">{faq.q}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300",
                  open === i && "rotate-180"
                )}
              />
            </button>
            <div
              className={cn(
                "grid transition-all duration-300",
                open === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div className="px-6 pb-5">
                  <p className="text-sm leading-relaxed text-slate-200">{faq.a}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
