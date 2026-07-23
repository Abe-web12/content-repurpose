"use client";

import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopyClipboard } from "@/hooks/use-copy-clipboard";

interface CopyButtonProps {
  text: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon" | "icon-sm";
}

export function CopyButton({ text, variant = "outline", size = "sm" }: CopyButtonProps) {
  const { copied, copy } = useCopyClipboard();

  return (
    <Button variant={variant} size={size} onClick={() => copy(text)}>
      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
      {size !== "icon" && size !== "icon-sm" && (copied ? "Copied" : "Copy")}
    </Button>
  );
}
