import { generateEmbedding } from "./provider";
import { prisma } from "@/lib/prisma";

export async function embedVoiceProfile(
  voiceProfileId: string,
  examplePosts: string[]
): Promise<void> {
  if (!examplePosts.length) return;

  const combinedText = examplePosts
    .map((post, i) => `Example ${i + 1}: ${post}`)
    .join("\n\n");

  try {
    const embedding = await generateEmbedding(combinedText);
    const embeddingJson = JSON.stringify(embedding);

    await prisma.voiceProfiles.update({
      where: { id: voiceProfileId },
      data: { embedding: embeddingJson },
    });
  } catch (err) {
    console.warn("Embedding skipped:", err instanceof Error ? err.message : "unknown error");
  }
}
