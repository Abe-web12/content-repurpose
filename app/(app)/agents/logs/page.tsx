import { Metadata } from "next";
import { LogsPageClient } from "./logs-page-client";

export const metadata: Metadata = {
  title: "Agent Logs - RepurposeAI",
};

export default function LogsPage() {
  return <LogsPageClient />;
}
