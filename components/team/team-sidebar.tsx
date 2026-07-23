"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, UserPlus, Shield, Settings, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const teamNav = [
  { label: "Overview", href: "/team", icon: Users },
  { label: "Members", href: "/team/members", icon: UserPlus },
  { label: "Invites", href: "/team/invites", icon: Activity },
  { label: "Roles", href: "/team/roles", icon: Shield },
  { label: "Settings", href: "/team/settings", icon: Settings },
];

export function TeamSidebar({ orgId, currentRole }: { orgId: string; currentRole?: string }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {teamNav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={`${item.href}?orgId=${orgId}`}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-indigo-500/10 text-indigo-300"
                : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
