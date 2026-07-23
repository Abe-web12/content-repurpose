"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Link } from "lucide-react";

interface OAuthButtonProps {
  integrationKey: string;
  organizationId: string;
  variant?: "default" | "outline" | "ghost";
}

export function OAuthButton({ integrationKey, organizationId, variant = "default" }: OAuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationKey, organizationId }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Connection failed");

      if (json.data?.authUrl) {
        window.location.href = json.data.authUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button variant={variant} onClick={handleConnect} disabled={loading}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Link className="mr-2 h-4 w-4" />
        )}
        {loading ? "Connecting..." : "Connect"}
      </Button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
