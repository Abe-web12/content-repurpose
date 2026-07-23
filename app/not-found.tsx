
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-brand-600">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-text-primary">
          Page not found
        </h2>
        <p className="mt-2 text-text-secondary">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/"
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Go home
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-surface-3 px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-1"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}