import { Metadata } from "next";
import { WorkflowsPageClient } from "./workflows-page-client";

export const metadata: Metadata = {
  title: "Agent Workflows - RepurposeAI",
};

export default function WorkflowsPage() {
  return <WorkflowsPageClient />;
}
