"use client";

import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const FAQS = [
  {
    q: "How does the AI content generation work?",
    a: "Paste your source content (YouTube URL, blog URL, podcast link, or raw text). Our AI extracts the key points, then repurposes it into your chosen format — LinkedIn post, Twitter thread, or LinkedIn carousel — matching your voice profile and brand kit.",
  },
  {
    q: "What is a voice profile?",
    a: "A voice profile captures your unique writing style. You provide 1-5 writing samples, and the AI learns your tone, phrasing, and structure. This ensures every generation sounds like you, not generic AI.",
  },
  {
    q: "What is a brand kit?",
    a: "Your brand kit stores your company name, description, target audience, brand voice guidelines, and colors. It's automatically injected into every generation so content stays on-brand.",
  },
  {
    q: "How many generations do I get?",
    a: "Free plan: 3 total generations. Starter ($19/mo): 30 generations/month. Pro ($49/mo): unlimited generations.",
  },
  {
    q: "Can I schedule posts?",
    a: "Yes! After generating content, you can schedule it for future publishing. When you connect your LinkedIn or Twitter account, scheduled posts are automatically published at the specified time.",
  },
  {
    q: "How do I connect my social media accounts?",
    a: "Go to Settings > Integrations and click 'Connect' on LinkedIn or Twitter. You'll be redirected to authorize the connection. Your tokens are securely stored and never exposed.",
  },
  {
    q: "What happens when I reach my generation limit?",
    a: "You'll receive an email alert at 80% usage and again at 100%. To continue generating, upgrade your plan from the Settings > Billing page.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes. Go to Settings > Billing and click 'Manage billing' to access the Stripe customer portal where you can cancel, pause, or change your plan.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All data is encrypted in transit (TLS) and at rest. OAuth tokens are stored securely in our database and are never exposed to the client side. We use Clerk for authentication and Neon PostgreSQL for data storage.",
  },
  {
    q: "Can I export my content?",
    a: "Yes. From the preview pane, you can copy to clipboard, download as Markdown (.md), Plain Text (.txt), or PDF (.pdf).",
  },
];

export default function FAQPage() {
  const [search, setSearch] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filtered = FAQS.filter(
    (faq) =>
      faq.q.toLowerCase().includes(search.toLowerCase()) ||
      faq.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-10">
      <PageHeader title="FAQ" description="Frequently asked questions" />

      <div className="relative mx-auto max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          placeholder="Search FAQ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="divide-y divide-surface-2 p-0">
          {filtered.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-surface-1"
              >
                <span className="text-sm font-medium text-text-primary">{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-text-muted transition-transform ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === i && (
                <div className="px-6 pb-4">
                  <p className="text-sm text-text-secondary leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
