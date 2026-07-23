"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, Minus } from "lucide-react";

interface HealthBadgeProps {
  status: string | null | undefined;
  lastCheckAt?: string | null;
}

export function HealthBadge({ status, lastCheckAt }: HealthBadgeProps) {
  if (!status) {
    return (
      <Badge variant="outline" className="border-gray-500/20 bg-gray-500/10 text-gray-400">
        <Minus className="mr-1 h-3 w-3" />
        Unknown
      </Badge>
    );
  }

  const isHealthy = status === "healthy";

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={cn(
          "border px-2 py-0 text-xs font-normal",
          isHealthy
            ? "border-green-500/20 bg-green-500/10 text-green-400"
            : "border-red-500/20 bg-red-500/10 text-red-400"
        )}
      >
        {isHealthy ? (
          <CheckCircle className="mr-1 h-3 w-3" />
        ) : (
          <AlertCircle className="mr-1 h-3 w-3" />
        )}
        {isHealthy ? "Healthy" : "Unhealthy"}
      </Badge>
      {lastCheckAt && (
        <span className="text-xs text-gray-500">
          Checked {new Date(lastCheckAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}
