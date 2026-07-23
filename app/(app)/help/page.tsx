"use client";

import Link from "next/link";
import { BookOpen, MessageCircle, HelpCircle, FileText, ExternalLink, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TOPICS = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description: "Learn the basics of RepurposeAI",
    href: "/help/faq",
  },
  {
    icon: MessageCircle,
    title: "Contact Support",
    description: "Get help from our team",
    href: "/help/contact",
  },
  {
    icon: FileText,
    title: "FAQ",
    description: "Frequently asked questions",
    href: "/help/faq",
  },
  {
    icon: HelpCircle,
    title: "Video Tutorials",
    description: "Watch how-to guides",
    href: "https://youtube.com/@repurposeai",
    external: true,
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Help Center"
        description="Learn how to get the most out of RepurposeAI."
      />

      <div className="relative mx-auto max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input placeholder="Search help articles..." className="pl-9" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {TOPICS.map((topic) => (
          <Link key={topic.title} href={topic.href} target={topic.external ? "_blank" : undefined}>
            <Card className="group cursor-pointer transition-all hover:shadow-md">
              <CardContent className="flex items-start gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                  <topic.icon className="h-6 w-6 text-brand-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{topic.title}</CardTitle>
                    {topic.external && <ExternalLink className="h-3 w-3 text-text-muted" />}
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">{topic.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
