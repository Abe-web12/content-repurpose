"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, BookOpen, Play, Clock, FileText, Brain, ArrowRight, Layers } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StudioStats {
  totalPrompts: number;
  totalKnowledgeBases: number;
  recentExecutions: number;
}

interface Activity {
  id: string;
  type: "prompt_created" | "prompt_edited" | "knowledge_added" | "execution";
  description: string;
  timestamp: string;
}

export default function AIStudioPage() {
  const [stats] = useState<StudioStats>({
    totalPrompts: 12,
    totalKnowledgeBases: 5,
    recentExecutions: 48,
  });
  const [activities] = useState<Activity[]>([
    { id: "1", type: "prompt_created", description: "Created new summarization prompt", timestamp: "2 min ago" },
    { id: "2", type: "knowledge_added", description: "Added 3 documents to Knowledge Base", timestamp: "15 min ago" },
    { id: "3", type: "execution", description: "Ran RAG query on customer docs", timestamp: "1 hour ago" },
    { id: "4", type: "prompt_edited", description: "Updated tone analysis prompt", timestamp: "3 hours ago" },
    { id: "5", type: "execution", description: "Batch processed 10 articles", timestamp: "5 hours ago" },
  ]);

  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "prompt_created": return <FileText className="h-4 w-4 text-blue-600" />;
      case "prompt_edited": return <FileText className="h-4 w-4 text-amber-600" />;
      case "knowledge_added": return <BookOpen className="h-4 w-4 text-emerald-600" />;
      case "execution": return <Play className="h-4 w-4 text-violet-600" />;
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="AI Studio"
        description="Manage prompts, knowledge bases, and run AI experiments."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Prompts</CardTitle>
            <FileText className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text-primary">{stats.totalPrompts}</div>
            <p className="text-xs text-text-muted">Active prompt templates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Knowledge Bases</CardTitle>
            <BookOpen className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text-primary">{stats.totalKnowledgeBases}</div>
            <p className="text-xs text-text-muted">Knowledge sources connected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Executions</CardTitle>
            <Play className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text-primary">{stats.recentExecutions}</div>
            <p className="text-xs text-text-muted">In the last 7 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Button asChild size="lg" className="gap-2">
          <Link href="/prompts/new">
            <Sparkles className="h-5 w-5" />
            New Prompt
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="gap-2">
          <Link href="/knowledge">
            <BookOpen className="h-5 w-5" />
            Upload Document
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="gap-2">
          <Link href="/playground">
            <Play className="h-5 w-5" />
            Open Playground
          </Link>
        </Button>
      </div>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-text-primary">Recent Activity</h3>
          <Button variant="outline" size="sm" asChild>
            <Link href="/history">
              View all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-4 px-6 py-4 border-b last:border-b-0 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {activity.description}
                  </p>
                </div>
                <span className="text-xs text-text-muted shrink-0">{activity.timestamp}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
