import { Metadata } from "next";
import { NewAgentClient } from "./new-agent-client";

export const metadata: Metadata = {
  title: "New Agent - RepurposeAI",
};

export default function NewAgentPage() {
  return <NewAgentClient />;
}
