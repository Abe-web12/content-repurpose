import { Metadata } from "next";
import { AgentDetailClient } from "./agent-detail-client";

export const metadata: Metadata = {
  title: "Agent Details - RepurposeAI",
};

export default function AgentDetailPage() {
  return <AgentDetailClient />;
}
