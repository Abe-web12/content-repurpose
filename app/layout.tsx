import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "@/styles/globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://repurposeai.com";

export const metadata: Metadata = {
  title: {
    default: "RepurposeAI — Turn Any Content Into Social Media Gold",
    template: "%s | RepurposeAI",
  },
  description:
    "AI-powered content repurposing tool. Turn YouTube videos, blog posts, and podcasts into LinkedIn posts, Twitter threads, and carousels in seconds. Free plan available.",
  keywords: [
    "content repurposing",
    "AI content generator",
    "LinkedIn post generator",
    "Twitter thread generator",
    "content marketing",
    "social media automation",
    "repurpose content",
    "AI writing tool",
    "LinkedIn carousel maker",
    "content repurposer SaaS",
  ],
  authors: [{ name: "RepurposeAI", url: siteUrl }],
  creator: "RepurposeAI",
  publisher: "RepurposeAI",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "RepurposeAI — Turn Any Content Into Social Media Gold",
    description:
      "AI-powered content repurposing. YouTube, blogs, podcasts → LinkedIn, Twitter, carousels in seconds. Free plan, no credit card required.",
    siteName: "RepurposeAI",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RepurposeAI — Content Repurposing Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RepurposeAI — Turn Any Content Into Social Media Gold",
    description:
      "AI-powered content repurposing. YouTube, blogs, podcasts → LinkedIn, Twitter, carousels in seconds. Free plan, no credit card required.",
    images: ["/og-image.png"],
    creator: "@repurposeai",
    site: "@repurposeai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        {process.env.NEXT_PUBLIC_APP_URL && (
          <>
            <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_APP_URL} />
            <link rel="preconnect" href={process.env.NEXT_PUBLIC_APP_URL} />
          </>
        )}
      </head>
      <body className="min-h-screen font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-brand-600 focus:text-white focus:outline-none"
        >
          Skip to main content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "RepurposeAI",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description:
                "AI-powered content repurposing platform. Turn YouTube videos, blog posts, and podcasts into LinkedIn posts, Twitter threads, and carousels in seconds.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                description: "Free plan with 3 generations. Paid plans start at $19/month.",
              },
              author: {
                "@type": "Organization",
                name: "RepurposeAI",
                url: siteUrl,
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "RepurposeAI",
              url: siteUrl,
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${siteUrl}/search?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <ClerkProvider>
          {children}
        </ClerkProvider>
        <Toaster />
      </body>
    </html>
  );
}
