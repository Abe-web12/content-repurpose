"use client";

import { usePathname } from "next/navigation";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard", "/generate": "Generate", "/history": "History",
  "/voice": "Voice Profiles", "/settings": "Settings", "/upgrade": "Upgrade",
  "/analytics": "Analytics", "/templates": "Templates",
};

export function Topbar() {
  const pathname = usePathname();
  const title = Object.entries(pageTitles).find(([r]) => pathname === r || pathname.startsWith(`${r}/`))?.[1] || "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#E2E8F0] bg-white/80 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <MobileNav />
        <h1 className="text-lg font-semibold text-[#0F172A]">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
