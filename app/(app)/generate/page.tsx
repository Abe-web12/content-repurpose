"use client";

import { PageHeader } from "@/components/shared/page-header";
import { GenerateProvider } from "@/contexts/generate-context";
import { SourcePane } from "@/components/generate/source-pane";
import { PromptPane } from "@/components/generate/prompt-pane";
import { PreviewPane } from "@/components/generate/preview-pane";
import { useGenerate } from "@/hooks/use-generate";

function GenerateContent() {
  const value = useGenerate();

  return (
    <GenerateProvider value={value}>
      <div className="space-y-6">
        <PageHeader
          title="Generate Content"
          description="Paste a source, pick a format, and get publish-ready content in seconds."
        />

        <div className="grid h-auto min-h-[calc(100vh-16rem)] grid-cols-1 gap-4 overflow-visible lg:h-[calc(100vh-16rem)] lg:grid-cols-3 lg:overflow-hidden rounded-2xl bg-[#F8FAFC] p-4">
          <div className="min-h-[320px] rounded-xl border border-surface-3 bg-white p-4 lg:min-h-0">
            <SourcePane />
          </div>

          <div className="min-h-[320px] rounded-xl border border-surface-3 bg-white p-4 lg:min-h-0">
            <PromptPane />
          </div>

          <div className="min-h-[320px] rounded-xl border border-surface-3 bg-white p-4 lg:min-h-0">
            <PreviewPane />
          </div>
        </div>
      </div>
    </GenerateProvider>
  );
}

export default function GeneratePage() {
  return <GenerateContent />;
}
