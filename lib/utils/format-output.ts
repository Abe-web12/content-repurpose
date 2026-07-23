export function formatTwitterThread(raw: string): string[] {
  const tweets: string[] = [];
  const lines = raw.split("\n");
  let currentTweet = "";

  for (const line of lines) {
    const tweetMatch = line.match(/^\d+[\/\.]\s*(.*)/);
    if (tweetMatch) {
      if (currentTweet.trim()) {
        tweets.push(currentTweet.trim());
      }
      currentTweet = tweetMatch[1];
    } else if (currentTweet && line.trim()) {
      currentTweet += " " + line.trim();
    }
  }

  if (currentTweet.trim()) {
    tweets.push(currentTweet.trim());
  }

  return tweets.map((tweet) =>
    tweet.length > 280 ? tweet.slice(0, 277) + "..." : tweet
  );
}

export interface CarouselSlide {
  number: number;
  headline: string;
  body: string;
}

export function formatCarouselSlides(raw: string): CarouselSlide[] {
  const slides: CarouselSlide[] = [];
  const blocks = raw.split(/\[Slide \d+\]/i).filter(Boolean);

  blocks.forEach((block, index) => {
    const headlineMatch = block.match(/Headline:\s*(.+)/i);
    const bodyMatch = block.match(/Body:\s*([\s\S]*?)(?=\n\n|\[Slide|$)/i);

    if (headlineMatch) {
      slides.push({
        number: index + 1,
        headline: headlineMatch[1].trim(),
        body: bodyMatch ? bodyMatch[1].trim() : "",
      });
    }
  });

  return slides;
}

export function countCharacters(text: string): number {
  return text.length;
}

export function countTweets(text: string): number {
  return formatTwitterThread(text).length;
}
