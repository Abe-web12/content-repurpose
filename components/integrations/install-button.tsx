"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { useRouter } from "next/navigation";

interface InstallButtonProps {
  integrationKey: string;
  organizationId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  onSuccess?: () => void;
}

export function InstallButton({ integrationKey, organizationId, variant = "default", size = "default", onSuccess }: InstallButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleInstall() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/marketplace/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationKey, organizationId }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Installation failed");

      router.refresh();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Installation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button
        variant={variant}
        size={size}
        onClick={handleInstall}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {loading ? "Installing..." : "Install"}
      </Button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
