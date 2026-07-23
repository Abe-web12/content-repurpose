"use client";

import { useState } from "react";
import { Save, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoUploader } from "./logo-uploader";
import { ColorEditor } from "./color-editor";
import { ThemePreview } from "./theme-preview";
import { DomainManager } from "./domain-manager";
import type { BrandingState, DomainState } from "@/hooks/use-branding";

interface BrandEditorProps {
  branding: BrandingState;
  domain: DomainState | null;
  dnsInstructions: Array<{ type: string; name: string; value: string; purpose: string }> | null;
  onSave: (data: Partial<BrandingState>) => Promise<boolean>;
  onReset: () => Promise<boolean>;
  onDomainUpdate: (domain: string) => Promise<boolean>;
  onDomainRemove: () => Promise<boolean>;
}

export function BrandEditor({ branding, domain, dnsInstructions, onSave, onReset, onDomainUpdate, onDomainRemove }: BrandEditorProps) {
  const [local, setLocal] = useState<BrandingState>(branding);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [success, setSuccess] = useState(false);

  const hasChanges = JSON.stringify(local) !== JSON.stringify(branding);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    const ok = await onSave(local);
    if (ok) setSuccess(true);
    setSaving(false);
  };

  const handleReset = async () => {
    if (!confirm("Reset all branding to default? This cannot be undone.")) return;
    setResetting(true);
    await onReset();
    setResetting(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Branding</h2>
          <p className="text-sm text-text-muted">Customize your organization's appearance</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={() => setLocal({ ...branding })} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Discard
            </Button>
          )}
          <Button variant="outline" onClick={handleReset} disabled={resetting} className="gap-2 text-red-600">
            <RotateCcw className="h-4 w-4" />
            {resetting ? "Resetting..." : "Reset"}
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
          Branding saved successfully!
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <LogoUploader label="Main Logo" description="Primary logo for light backgrounds" value={local.logo} onChange={(v) => setLocal({ ...local, logo: v })} />
            <LogoUploader label="Light Logo" description="Logo for dark backgrounds" value={local.logoLight} onChange={(v) => setLocal({ ...local, logoLight: v })} />
            <LogoUploader label="Dark Logo" description="Alternative dark version" value={local.logoDark} onChange={(v) => setLocal({ ...local, logoDark: v })} />
            <LogoUploader label="Favicon" description="Browser tab icon (16x16 or 32x32)" value={local.favicon} onChange={(v) => setLocal({ ...local, favicon: v })} />
          </div>

          <ColorEditor
            brandColor={local.brandColor || "#6366f1"}
            secondaryColor={local.secondaryColor || "#4f46e5"}
            accentColor={local.accentColor || "#10b981"}
            onChange={(colors) => setLocal({ ...local, brandColor: colors.brandColor, secondaryColor: colors.secondaryColor, accentColor: colors.accentColor })}
          />

          <DomainManager
            domain={domain}
            dnsInstructions={dnsInstructions}
            onUpdate={onDomainUpdate}
            onRemove={onDomainRemove}
          />
        </div>

        <div className="space-y-6">
          <ThemePreview
            brandColor={local.brandColor || "#6366f1"}
            secondaryColor={local.secondaryColor || "#4f46e5"}
            accentColor={local.accentColor || "#10b981"}
            logo={local.logo}
          />
        </div>
      </div>
    </div>
  );
}
