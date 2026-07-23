import type { Metadata } from "next";

export const metadata: Metadata = { title: "Changelog" };

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">Changelog</h1>
      <p className="mt-3 text-text-secondary">What&apos;s new and improved in RepurposeAI.</p>

      <div className="mt-12 space-y-10">
        <Entry date="Jul 19, 2026" version="1.0.0" items={[
          "Launch: AI content repurposing engine",
          "LinkedIn posts, carousels, and X threads",
          "Voice profile system with tone matching",
          "YouTube, blog, and podcast extraction",
          "Chrome extension for in-page repurposing",
          "Stripe billing (Free, Starter, Pro)",
          "3D animated landing page",
        ]} />
      </div>
    </div>
  );
}

function Entry({ date, version, items }: { date: string; version: string; items: string[] }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-text-primary">v{version}</span>
        <span className="text-sm text-text-muted">{date}</span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-sm text-text-secondary">&bull; {item}</li>
        ))}
      </ul>
    </div>
  );
}
