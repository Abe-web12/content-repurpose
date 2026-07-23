"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { CreditCard, Receipt, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/billing", label: "Overview", icon: CreditCard },
  { href: "/billing/credits", label: "Credits", icon: Coins },
  { href: "/billing/invoices", label: "Invoices", icon: Receipt },
];

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Billing</h1>
        <p className="mt-1 text-sm text-text-muted">Manage your subscription, credits, and billing history.</p>
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-lg bg-surface-1 p-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-muted hover:bg-white/50 hover:text-text-primary",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
