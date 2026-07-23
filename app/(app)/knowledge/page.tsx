import { Metadata } from "next";
import { KnowledgePageClient } from "./knowledge-page-client";

export const metadata: Metadata = {
  title: "Knowledge Bases - RepurposeAI",
};

export default function KnowledgePage() {
  return <KnowledgePageClient />;
}
