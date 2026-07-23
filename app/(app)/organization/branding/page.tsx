"use client";

import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BrandEditor } from "@/components/branding/brand-editor";
import { useBranding, useDomain } from "@/hooks/use-branding";

export default function OrganizationBrandingPage() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId") || "default";
  const { branding, loading, updateBranding, resetBranding } = useBranding(orgId);
  const { domain, instructions: dnsInstructions, updateDomain, removeDomain, loading: domainLoading } = useDomain(orgId);

  if (loading || domainLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!branding) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-text-muted">Could not load branding settings</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <BrandEditor
        branding={branding}
        domain={domain}
        dnsInstructions={dnsInstructions}
        onSave={updateBranding}
        onReset={resetBranding}
        onDomainUpdate={updateDomain}
        onDomainRemove={removeDomain}
      />
    </div>
  );
}
