"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Globe, Puzzle } from "lucide-react";
import Link from "next/link";

interface DeveloperCardProps {
  name: string;
  email?: string | null;
  websiteUrl?: string | null;
  integrationCount?: number;
}

export function DeveloperCard({ name, email, websiteUrl, integrationCount }: DeveloperCardProps) {
  return (
    <Card className="border-white/5 bg-[#1E293B] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10">
          <Puzzle className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h4 className="text-sm font-medium text-white">{name}</h4>
          <p className="text-xs text-gray-500">Developer</p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {email && (
          <a href={`mailto:${email}`} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white">
            <Mail className="h-3.5 w-3.5" />
            {email}
          </a>
        )}
        {websiteUrl && (
          <Link href={websiteUrl} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white">
            <Globe className="h-3.5 w-3.5" />
            {new URL(websiteUrl).hostname}
          </Link>
        )}
        {integrationCount !== undefined && (
          <Badge variant="outline" className="border-white/10 text-gray-400">
            {integrationCount} integrations
          </Badge>
        )}
      </div>
    </Card>
  );
}
