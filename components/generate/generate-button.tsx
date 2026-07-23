"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GenerateButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  label?: string;
}

export function GenerateButton({
  onClick,
  loading,
  disabled,
  label = "Generate content",
}: GenerateButtonProps) {
  return (
    <Button
      size="lg"
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      className="w-full sm:w-auto"
    >
      <Sparkles className="h-4 w-4" />
      {label}
    </Button>
  );
}
