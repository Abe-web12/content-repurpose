"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PLANS, type PlanKey } from "@/lib/constants/plans";
import { cn } from "@/lib/utils";
import { TextReveal3D } from "@/components/marketing/text-reveal-3d";

export function PricingSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 sm:py-32" id="pricing">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-indigo-300">Pricing</p>
        <TextReveal3D
          as="h2"
          className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl"
          delay={0.1}
          stagger={0.05}
          threshold={0.1}
        >
          Start free. Scale when you need to.
        </TextReveal3D>
      </motion.div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(PLANS) as PlanKey[]).map((key, i) => {
          const plan = PLANS[key];

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={cn(
                "group relative rounded-2xl border bg-white/[0.03] backdrop-blur-xl p-8 transition-all duration-500",
                plan.popular
                  ? "border-brand-500/50 ring-1 ring-brand-500/20 hover:border-brand-400 hover:ring-brand-500/30"
                  : "border-white/10 hover:border-white/20 hover:bg-white/[0.06]"
              )}
            >
              {plan.popular && (
                <span
                  className="absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-semibold text-white transition-colors duration-500"
                  style={{ backgroundColor: "var(--section-accent, #6366f1)" }}
                >
                  Popular
                </span>
              )}

              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">${plan.price}</span>
                {plan.price > 0 && <span className="text-slate-400">/mo</span>}
              </div>
              <p className="mt-2 text-sm text-slate-200">{plan.generationsLabel}</p>

              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-200">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="mt-8 w-full"
                variant={plan.popular ? "default" : "outline"}
                size="lg"
                asChild
              >
                <Link href="/signup">
                  {key === "free" ? "Get started free" : `Start with ${plan.name}`}
                </Link>
              </Button>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
