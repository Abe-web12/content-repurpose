"use client";

import type { OutputFormat } from "@/lib/constants/formats";
import { OutputLinkedIn } from "./output-linkedin";
import { OutputTwitter } from "./output-twitter";
import { OutputCarousel } from "./output-carousel";

interface OutputDisplayProps {
  format: OutputFormat;
  content: string;
  streaming?: boolean;
}

export function OutputDisplay({ format, content, streaming }: OutputDisplayProps) {
  switch (format) {
    case "linkedin_post":
      return <OutputLinkedIn content={content} streaming={streaming} />;
    case "twitter_thread":
      return <OutputTwitter content={content} streaming={streaming} />;
    case "linkedin_carousel":
      return <OutputCarousel content={content} streaming={streaming} />;
    default:
      return null;
  }
}
