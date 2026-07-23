import { Metadata } from "next";
import { Suspense } from "react";
import { PromptsPageClient } from "./prompts-page-client";

export const metadata: Metadata = {
  title: "Prompt Templates - RepurposeAI",
};

export default function PromptsPage() {
  return (
    <Suspense fallback={null}>
      <PromptsPageClient />
    </Suspense>
  );
}
