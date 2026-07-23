"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, LayoutDashboard, Mic2, Settings, Sparkles, BarChart3, FileText, HelpCircle, CreditCard, Gift, Users, Shield, Code, Puzzle, Store } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { UsageBadge } from "@/components/layout/usage-badge";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Generate", href: "/generate", icon: Sparkles },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Templates", href: "/templates", icon: FileText },
  { label: "History", href: "/history", icon: Clock },
  { label: "Voice Profiles", href: "/voice", icon: Mic2 },
  { label: "Integrations", href: "/integrations", icon: Puzzle },
  { label: "Marketplace", href: "/marketplace", icon: Store },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Referrals", href: "/referrals", icon: Gift },
  { label: "Team", href: "/team?orgId=default", icon: Users },
  { label: "Security", href: "/security", icon: Shield },
  { label: "Developers", href: "/developers", icon: Code },
  { label: "Settings", href: "/settings", icon: Settings },
];

const bottomItems = [
  { label: "Help Center", href: "/help", icon: HelpCircle },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col border-r border-white/5 bg-[#0F172A] px-4 py-6">
      <div className="px-3">
        <Logo inverted />
      </div>

      <div className="mt-6 px-3">
        <WorkspaceSwitcher />
      </div>

      <nav className="mt-4 flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-500/10 text-indigo-300"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1">
        {bottomItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-500/10 text-indigo-300"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
        <UsageBadge />
      </div>
    </aside>
  );
}
