import { Metadata } from "next";
import { TasksPageClient } from "./tasks-page-client";

export const metadata: Metadata = {
  title: "Agent Tasks - RepurposeAI",
};

export default function TasksPage() {
  return <TasksPageClient />;
}
