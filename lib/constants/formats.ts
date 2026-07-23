
export type OutputFormat = "linkedin_post" | "linkedin_carousel" | "twitter_thread";

export type InputType = "youtube_url" | "blog_url" | "podcast_url" | "raw_text";

export interface FormatInfo {
  key: OutputFormat;
  label: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  preview: string;
}

export interface InputInfo {
  key: InputType;
  label: string;
  placeholder: string;
  icon: string;
  description: string;
}

export const OUTPUT_FORMATS: Record<OutputFormat, FormatInfo> = {
  linkedin_post: {
    key: "linkedin_post",
    label: "LinkedIn Post",
    description: "A single engaging post optimized for LinkedIn's algorithm",
    icon: "Linkedin",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    preview: "150-300 words, hook-first structure",
  },
  linkedin_carousel: {
    key: "linkedin_carousel",
    label: "LinkedIn Carousel",
    description: "Slide-by-slide content for a PDF carousel document",
    icon: "Layers",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    preview: "8-10 slides with headlines and body text",
  },
  twitter_thread: {
    key: "twitter_thread",
    label: "Twitter/X Thread",
    description: "A multi-tweet thread optimized for engagement",
    icon: "Twitter",
    color: "text-sky-500",
    bgColor: "bg-sky-50",
    preview: "5-9 tweets, each under 280 characters",
  },
};

export const INPUT_TYPES: Record<InputType, InputInfo> = {
  youtube_url: {
    key: "youtube_url",
    label: "YouTube",
    placeholder: "https://youtube.com/watch?v=...",
    icon: "Youtube",
    description: "Paste a YouTube video URL to extract its transcript",
  },
  blog_url: {
    key: "blog_url",
    label: "Blog URL",
    placeholder: "https://example.com/blog/article-title",
    icon: "Globe",
    description: "Paste any blog or article URL to extract its content",
  },
  podcast_url: {
    key: "podcast_url",
    label: "Podcast",
    placeholder: "https://spotify.com/episode/... or audio URL",
    icon: "Podcast",
    description: "Paste a podcast episode URL for AI transcription",
  },
  raw_text: {
    key: "raw_text",
    label: "Paste Text",
    placeholder: "Paste your content here (article, transcript, notes, ideas...)",
    icon: "FileText",
    description: "Paste any text content directly",
  },
};

export const FORMAT_LIST = Object.values(OUTPUT_FORMATS);
export const INPUT_LIST = Object.values(INPUT_TYPES);