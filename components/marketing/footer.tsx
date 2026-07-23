import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export function Footer() {
  return (
    <footer className="border-t border-surface-3 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-text-muted">
              AI-powered content repurposing for founders and marketers.
            </p>
          </div>

          <div className="flex gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Product</p>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="/pricing" className="text-sm text-text-secondary hover:text-text-primary">Pricing</Link>
                <Link href="/changelog" className="text-sm text-text-secondary hover:text-text-primary">Changelog</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Legal</p>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="/legal/privacy" className="text-sm text-text-secondary hover:text-text-primary">Privacy</Link>
                <Link href="/legal/terms" className="text-sm text-text-secondary hover:text-text-primary">Terms</Link>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-10 text-xs text-text-muted">
          &copy; 2026 RepurposeAI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
