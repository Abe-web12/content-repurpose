import { prisma } from "@/lib/prisma";

export interface ChunkResult {
  content: string;
  chunkIndex: number;
  tokenCount: number;
}

export function chunkText(text: string, chunkSize = 500, overlap = 50): ChunkResult[] {
  const chunks: ChunkResult[] = [];
  const words = text.split(/\s+/);
  let start = 0;
  let index = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const content = words.slice(start, end).join(" ");
    chunks.push({
      content,
      chunkIndex: index++,
      tokenCount: Math.ceil(content.length / 4),
    });
    if (end >= words.length) break;
    start = end - overlap;
  }
  return chunks;
}

export function generateEmbeddingId(chunkId: string, model: string): string {
  return `${chunkId}:${model}`;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export function parseEmbeddingVector(vector: string): number[] {
  try {
    return JSON.parse(vector);
  } catch {
    return [];
  }
}

export function vectorToString(vector: number[]): string {
  return JSON.stringify(vector);
}

export const SUPPORTED_FILE_TYPES = ["pdf", "docx", "txt", "md", "csv", "html"] as const;

export function validateFileType(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase();
  return ext ? (SUPPORTED_FILE_TYPES as readonly string[]).includes(ext) : false;
}

export function getFileType(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "txt";
}
