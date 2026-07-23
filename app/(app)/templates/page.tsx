"use client";

import { PageHeader } from "@/components/shared/page-header";
import { TemplateLibrary } from "@/components/templates/template-library";

export default function TemplatesPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Templates"
        description="Reusable content templates for every platform."
      />
      <TemplateLibrary />
    </div>
  );
}
