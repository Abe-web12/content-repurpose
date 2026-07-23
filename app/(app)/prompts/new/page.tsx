import { Metadata } from "next";
import { NewPromptForm } from "./new-prompt-form";

export const metadata: Metadata = {
  title: "New Prompt - RepurposeAI",
};

export default function NewPromptPage() {
  return <NewPromptForm />;
}
