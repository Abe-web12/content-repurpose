import { Metadata } from "next";
import { PlaygroundPageClient } from "./playground-page-client";

export const metadata: Metadata = {
  title: "AI Playground - RepurposeAI",
};

export default function PlaygroundPage() {
  return <PlaygroundPageClient />;
}
