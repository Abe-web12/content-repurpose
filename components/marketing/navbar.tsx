"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/changelog", label: "Changelog" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a1a]/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo className="text-white [&_span]:text-white" />

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-white/60 hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm" asChild className="text-white/70 hover:text-white hover:bg-white/10">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild className="bg-indigo-500 hover:bg-indigo-400 border-0">
            <Link href="/signup">Start free</Link>
          </Button>
        </div>

        <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-white/70">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#0a0a1a] px-5 py-4 md:hidden">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-white/60">
              {link.label}
            </Link>
          ))}
          <div className="mt-4 flex gap-3">
            <Button variant="ghost" size="sm" asChild className="flex-1 text-white/70 hover:text-white hover:bg-white/10">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild className="flex-1 bg-indigo-500 hover:bg-indigo-400 border-0">
              <Link href="/signup">Start free</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
