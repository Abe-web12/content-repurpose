import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Blog" };

const posts = [
  { slug: "repurpose-youtube-to-linkedin", title: "How to Repurpose YouTube Videos Into LinkedIn Content", date: "Jul 10, 2026", readTime: "5 min" },
  { slug: "ai-content-repurposer-guide", title: "AI Content Repurposing: The Complete Guide for 2026", date: "Jul 8, 2026", readTime: "7 min" },
  { slug: "turn-blog-into-twitter-thread", title: "Turn Any Blog Post Into a Viral Twitter Thread", date: "Jul 5, 2026", readTime: "4 min" },
];

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">Blog</h1>
      <p className="mt-3 text-text-secondary">Guides on content repurposing, AI writing, and social media growth.</p>

      <div className="mt-12 space-y-8">
        {posts.map((post) => (
          <article key={post.slug}>
            <Link href={`/blog/${post.slug}`} className="group block">
              <h2 className="text-xl font-semibold text-text-primary group-hover:text-brand-600">{post.title}</h2>
              <p className="mt-1.5 text-sm text-text-muted">{post.date} &middot; {post.readTime} read</p>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
