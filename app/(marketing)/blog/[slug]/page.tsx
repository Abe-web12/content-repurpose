import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

const articles: Record<string, { title: string; content: string }> = {
  "repurpose-youtube-to-linkedin": {
    title: "How to Repurpose YouTube Videos Into LinkedIn Content",
    content: `Publishing a YouTube video takes hours of scripting, recording, and editing. Yet most creators let that effort die on one platform.\n\nRepurposing your video content into LinkedIn posts multiplies your reach without multiplying your work. Here's how:\n\n**Step 1: Extract the transcript.** Tools like RepurposeAI pull the full transcript from any YouTube URL automatically.\n\n**Step 2: Identify the hook.** Find the single most interesting insight, stat, or contrarian take from the video.\n\n**Step 3: Write for the format.** LinkedIn posts need a scroll-stopping first line, short paragraphs, and a question at the end. The AI handles the formatting.\n\n**Step 4: Match your voice.** Generic AI output sounds like... AI. Voice profiles ensure the post sounds like you actually wrote it.\n\nThe result: one video becomes a LinkedIn post, a carousel, and an X thread. Three channels from one recording session.`,
  },
  "ai-content-repurposer-guide": {
    title: "AI Content Repurposing: The Complete Guide for 2026",
    content: `Content repurposing isn't new. Marketers have done it manually for years. What's new is doing it in 60 seconds with AI that actually sounds human.\n\n**Why repurpose?** The best content marketers publish across 3-5 channels. But nobody has time to write unique content for each one. Repurposing takes your strongest ideas and adapts them to each platform's format.\n\n**What works as source material:**\n- Long-form YouTube videos (10+ minutes)\n- Blog posts (800+ words)\n- Podcast episodes\n- Newsletter issues\n- Conference talks\n\n**What to repurpose INTO:**\n- LinkedIn posts (hook + insight + CTA)\n- Twitter/X threads (5-9 connected tweets)\n- LinkedIn carousels (slide-by-slide takeaways)\n\n**The AI advantage:** Modern AI doesn't just summarize. Multi-step pipelines extract key insights, analyze hook angles, then generate platform-native content. Voice matching ensures consistency.`,
  },
  "turn-blog-into-twitter-thread": {
    title: "Turn Any Blog Post Into a Viral Twitter Thread",
    content: `Blog posts average 1,000-2,000 words. Twitter threads work best at 5-9 tweets. The art is compression without losing the substance.\n\n**The formula that works:**\n\nTweet 1: Bold claim or curiosity hook (no "Thread:" prefix)\nTweets 2-7: One insight per tweet, each under 280 characters\nFinal tweet: Summary + follow CTA\n\n**What makes threads go viral:**\n- Specificity (numbers, examples, names)\n- Each tweet works standalone (people quote-tweet individual tweets)\n- Contrarian takes that challenge assumptions\n- Practical value people can act on immediately\n\n**Common mistakes:**\n- Making tweet 1 too long (it shows truncated in feeds)\n- Using bullet points (use \u2192 instead)\n- Generic advice that applies to everyone\n\nThe fastest path: paste your blog URL into RepurposeAI, select "X Thread," and get a publish-ready thread in under 30 seconds.`,
  },
};

export async function generateStaticParams() {
  return Object.keys(articles).map((slug) => ({ slug }));
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles[slug];

  if (!article) notFound();

  return (
    <article className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      <Link href="/blog" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700">
        <ArrowLeft className="h-4 w-4" /> Back to blog
      </Link>

      <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">{article.title}</h1>

      <div className="prose mt-10 max-w-none">
        {article.content.split("\n\n").map((paragraph, i) => (
          <p key={i} className="mb-4 text-base leading-7 text-text-secondary" dangerouslySetInnerHTML={{ __html: paragraph.replace(/\*\*(.*?)\*\*/g, "<strong class='text-text-primary'>$1</strong>").replace(/\n/g, "<br/>") }} />
        ))}
      </div>
    </article>
  );
}
