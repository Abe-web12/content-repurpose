import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const publicRoutes = createRouteMatcher([
  "/",
  "/pricing",
  "/blog",
  "/changelog",
  "/legal(.*)",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/callback",
  "/sso-callback",
  "/api/health",
  "/api/billing/webhook",
  "/api/webhooks/clerk",
]);

function warnProductionDevKeys() {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
  if (process.env.NODE_ENV === "production" && key.startsWith("pk_test_")) {
    console.error(
      "[CLERK] PRODUCTION WARNING: Using Clerk development keys (pk_test_...). " +
      "Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to a production key (pk_live_...) in your Vercel environment variables."
    );
  }
}

function buildCSP(): string {
  const isDev = process.env.NODE_ENV === "development";

  const self = "'self'";
  const unsafeInline = "'unsafe-inline'";
  const unsafeEval = isDev ? " 'unsafe-eval'" : "";

  const clerkAccounts = "https://*.clerk.accounts.dev";
  const clerkCom = "https://clerk.com";
  const turnstile = "https://challenges.cloudflare.com";
  const stripeJs = "https://js.stripe.com";
  const sentryCdn = "https://browser.sentry-cdn.com";
  const vercelScripts = "https://va.vercel-scripts.com";

  const scriptSrc = `${self} ${unsafeInline}${unsafeEval} ${clerkAccounts} ${clerkCom} ${turnstile} ${stripeJs} ${sentryCdn} ${vercelScripts}`;
  const scriptSrcElem = `${self} ${unsafeInline}${unsafeEval} ${clerkAccounts} ${clerkCom} ${turnstile} ${stripeJs} ${sentryCdn} ${vercelScripts}`;

  const clerkApi = "https://api.clerk.com";
  const clerkTelemetry = "https://clerk-telemetry.com";
  const clerkSessions = "https://sessions.clerk.com";
  const stripeApi = "https://api.stripe.com";
  const sentryIngest = "https://*.sentry.io https://o*.ingest.sentry.io";
  const vercelConnect = "https://va.vercel-scripts.com";

  const connectSrc = `${self} ${clerkAccounts} ${clerkApi} ${clerkTelemetry} ${clerkSessions} ${turnstile} ${stripeApi} ${sentryIngest} ${vercelConnect}`;

  const styleSrc = `${self} ${unsafeInline} https://fonts.googleapis.com`;
  const styleSrcElem = `${self} ${unsafeInline} https://fonts.googleapis.com`;

  const fontSrc = `${self} data: https://fonts.gstatic.com`;

  const imgSrc = `${self} data: blob: https://img.clerk.com ${clerkAccounts} https://res.cloudinary.com https://avatars.githubusercontent.com https://lh3.googleusercontent.com`;

  const mediaSrc = `${self} blob:`;

  const workerSrc = `${self} blob:`;

  const childSrc = `${self} blob:`;

  const frameSrc = `${self} ${clerkAccounts} ${turnstile} ${stripeJs}`;

  return [
    `default-src ${self}`,
    `script-src ${scriptSrc}`,
    `script-src-elem ${scriptSrcElem}`,
    `connect-src ${connectSrc}`,
    `style-src ${styleSrc}`,
    `style-src-elem ${styleSrcElem}`,
    `font-src ${fontSrc}`,
    `img-src ${imgSrc}`,
    `media-src ${mediaSrc}`,
    `worker-src ${workerSrc}`,
    `child-src ${childSrc}`,
    `frame-src ${frameSrc}`,
    `frame-ancestors 'none'`,
    `manifest-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

export default clerkMiddleware(async (auth, req) => {
  warnProductionDevKeys();

  if (!publicRoutes(req)) {
    await auth.protect();
  }

  const response = NextResponse.next();

  const csp = buildCSP();
  response.headers.set("Content-Security-Policy", csp);

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
