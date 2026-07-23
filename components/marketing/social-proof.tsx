"use client";

import { motion } from "framer-motion";

const STATS = [
  { value: "200+", label: "active users" },
  { value: "3", label: "output formats" },
  { value: "4", label: "input sources" },
  { value: "60s", label: "average generation" },
] as const;

export function SocialProof() {
  return (
    <section className="border-y border-white/10 bg-white/[0.02] backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, staggerChildren: 0.1 }}
          className="flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-center sm:gap-16 sm:text-left"
        >
          {STATS.map((stat) => (
            <Stat key={stat.label} value={stat.value} label={stat.label} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <p className="text-2xl font-bold text-white sm:text-3xl">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{label}</p>
    </motion.div>
  );
}
