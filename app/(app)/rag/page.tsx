import { Metadata } from "next";
import { RAGPageClient } from "./rag-page-client";

export const metadata: Metadata = {
  title: "RAG Query - RepurposeAI",
};

export default function RAGPage() {
  return <RAGPageClient />;
}
