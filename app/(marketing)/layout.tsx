import type { Metadata } from "next";
import { CursorProvider } from "@/components/marketing/cursor-tracker";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://repurposeai.com";

export const metadata: Metadata = {
  title: "RepurposeAI — Turn Any Content Into Social Media Gold",
  description:
    "AI-powered content repurposing tool. Turn YouTube videos, blog posts, and podcasts into LinkedIn posts, Twitter threads, and carousels in seconds. Free plan available, no credit card required.",
  openGraph: {
    title: "RepurposeAI — Turn Any Content Into Social Media Gold",
    description:
      "AI-powered content repurposing. YouTube, blogs, podcasts → LinkedIn, Twitter, carousels in seconds. Free plan, no credit card required.",
    url: siteUrl,
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
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <CursorProvider>
      <Navbar />
      <main id="main-content">{children}</main>
      <Footer />
    </CursorProvider>
  );
}
