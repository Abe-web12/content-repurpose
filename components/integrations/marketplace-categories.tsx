"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Database, Layout, Users, Share2, FileText,
  Zap, Brain, BarChart3, Megaphone, Code, Briefcase, DollarSign, Folder
} from "lucide-react";

const categoryIcons: Record<string, React.ReactNode> = {
  COMMUNICATION: <MessageSquare className="h-5 w-5" />,
  STORAGE: <Database className="h-5 w-5" />,
  PRODUCTIVITY: <Layout className="h-5 w-5" />,
  CRM: <Users className="h-5 w-5" />,
  SOCIAL: <Share2 className="h-5 w-5" />,
  CMS: <FileText className="h-5 w-5" />,
  AUTOMATION: <Zap className="h-5 w-5" />,
  AI: <Brain className="h-5 w-5" />,
  ANALYTICS: <BarChart3 className="h-5 w-5" />,
  MARKETING: <Megaphone className="h-5 w-5" />,
  DEVELOPER_TOOLS: <Code className="h-5 w-5" />,
  HR: <Briefcase className="h-5 w-5" />,
  FINANCE: <DollarSign className="h-5 w-5" />,
  OTHER: <Folder className="h-5 w-5" />,
};

interface MarketplaceCategoriesProps {
  categories: Array<{ category: string; count: number }>;
  selected: string | null;
  onSelect: (category: string | null) => void;
}

export function MarketplaceCategories({ categories, selected, onSelect }: MarketplaceCategoriesProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {categories.map((cat) => (
        <Card
          key={cat.category}
          onClick={() => onSelect(cat.category === selected ? null : cat.category)}
          className={cn(
            "flex cursor-pointer items-center gap-3 border-white/5 bg-[#1E293B] p-4 transition-all hover:border-indigo-500/30",
            selected === cat.category && "border-indigo-500/50 bg-indigo-500/5"
          )}
        >
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            selected === cat.category ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-gray-400"
          )}>
            {categoryIcons[cat.category] || <Folder className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm font-medium text-white capitalize">{cat.category.toLowerCase()}</p>
            <p className="text-xs text-gray-500">{cat.count} integrations</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
