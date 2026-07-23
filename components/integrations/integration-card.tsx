"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Puzzle, CheckCircle, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";

interface IntegrationCardProps {
  integrationKey: string;
  name: string;
  description: string;
  icon?: string;
  category?: string;
  status?: string;
  health?: string | null;
  lastSyncAt?: string | null;
  href?: string;
  onInstall?: () => void;
  onSync?: () => void;
  installed?: boolean;
  featured?: boolean;
  rating?: number;
  installCount?: number;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  CONNECTED: { label: "Connected", className: "bg-green-500/10 text-green-400 border-green-500/20" },
  DISCONNECTED: { label: "Disconnected", className: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  ERROR: { label: "Error", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  EXPIRED: { label: "Expired", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  REVOKED: { label: "Revoked", className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  PENDING: { label: "Pending", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
};

export function IntegrationCard({
  name,
  description,
  icon,
  category,
  status,
  health,
  lastSyncAt,
  href,
  onInstall,
  onSync,
  installed,
  featured,
  rating,
  installCount,
}: IntegrationCardProps) {
  const statusInfo = status ? statusConfig[status] || statusConfig.DISCONNECTED : null;

  return (
    <Card className="group relative overflow-hidden border-white/5 bg-[#1E293B] p-5 transition-all hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5">
      {featured && (
        <div className="absolute right-0 top-0 rounded-bl-lg bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-400">
          Featured
        </div>
      )}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10">
          <Puzzle className="h-6 w-6 text-indigo-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white truncate">{name}</h3>
            {statusInfo && (
              <Badge variant="outline" className={cn("border px-2 py-0 text-xs font-normal", statusInfo.className)}>
                {statusInfo.label}
              </Badge>
            )}
            {health === "healthy" && (
              <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
            )}
            {health === "unhealthy" && (
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            )}
          </div>
          <p className="mt-1 text-sm text-gray-400 line-clamp-2">{description}</p>
          {category && (
            <p className="mt-1 text-xs text-gray-500">{category}</p>
          )}
          {lastSyncAt && (
            <p className="mt-1 text-xs text-gray-500">
              Last sync: {new Date(lastSyncAt).toLocaleDateString()}
            </p>
          )}
          {rating !== undefined && (
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
              <span>{"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}</span>
              <span>{rating.toFixed(1)}</span>
              {installCount !== undefined && <span>· {installCount} installs</span>}
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {href && (
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" asChild>
            <Link href={href}>
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Details
            </Link>
          </Button>
        )}
        {installed === false && onInstall && (
          <Button size="sm" onClick={onInstall} className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white">
            Install
          </Button>
        )}
        {installed === true && onSync && (
          <Button variant="outline" size="sm" onClick={onSync} className="ml-auto border-white/10 text-gray-300 hover:text-white">
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Sync
          </Button>
        )}
      </div>
    </Card>
  );
}
