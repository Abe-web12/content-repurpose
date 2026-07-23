import { Metadata } from "next";
import { AgentsPageClient } from "./agents-page-client";

export const metadata: Metadata = {
  title: "AI Agents - RepurposeAI",
};

export default function AgentsPage() {
  return <AgentsPageClient />;
}
