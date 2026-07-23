"use client";

import { Sparkles, Mic2, Palette, Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const ACTIONS = [
  {
    icon: Sparkles,
    label: "Generate Content",
    description: "Create a new post or thread",
    href: "/generate",
    color: "text-brand-600 bg-brand-50",
  },
  {
    icon: Mic2,
    label: "Create Voice Profile",
    description: "Teach AI your writing style",
    href: "/voice",
    color: "text-purple-600 bg-purple-50",
  },
  {
    icon: Palette,
    label: "Set Up Brand Kit",
    description: "Define your brand identity",
    href: "/settings",
    color: "text-amber-600 bg-amber-50",
  },
  {
    icon: Calendar,
    label: "Schedule Posts",
    description: "Plan your content calendar",
    href: "/generate",
    color: "text-emerald-600 bg-emerald-50",
  },
];

export function QuickActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ACTIONS.map((action) => (
        <Link key={action.href + action.label} href={action.href}>
          <Card className="group cursor-pointer transition-all hover:shadow-md">
            <CardContent className="flex items-start gap-4 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${action.color}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">{action.label}</p>
                <p className="text-xs text-text-muted">{action.description}</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
