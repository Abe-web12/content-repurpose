"use client";

import { useState, useEffect, useCallback } from "react";
import { Palette, Loader2, Plus, X, Check, Users, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showError, showSuccess } from "@/components/ui/toast";

const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

interface BrandKitData {
  company_name: string;
  company_description: string;
  target_audience: string;
  brand_colors: string[];
  brand_voice: string;
  logo_url: string;
}

interface BrandKitFormProps {
  onSave?: () => void;
}

export function BrandKitForm({ onSave }: BrandKitFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BrandKitData>({
    company_name: "",
    company_description: "",
    target_audience: "",
    brand_colors: ["#6366F1"],
    brand_voice: "",
    logo_url: "",
  });
  const [newColor, setNewColor] = useState("#6366F1");

  const fetchBrandKit = useCallback(async () => {
    try {
      const res = await fetch("/api/brand-kit");
      const json = await res.json();
      if (json.data) {
        setForm({
          company_name: json.data.company_name || "",
          company_description: json.data.company_description || "",
          target_audience: json.data.target_audience || "",
          brand_colors: json.data.brand_colors?.length ? json.data.brand_colors : ["#6366F1"],
          brand_voice: json.data.brand_voice || "",
          logo_url: json.data.logo_url || "",
        });
      }
    } catch {
      // Brand kit not found — use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrandKit();
  }, [fetchBrandKit]);

  function addColor() {
    if (HEX_REGEX.test(newColor) && !form.brand_colors.includes(newColor.toUpperCase())) {
      setForm({ ...form, brand_colors: [...form.brand_colors, newColor.toUpperCase()] });
      setNewColor("#6366F1");
    }
  }

  function removeColor(index: number) {
    setForm({ ...form, brand_colors: form.brand_colors.filter((_, i) => i !== index) });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/brand-kit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        showError(json.error || "Failed to save brand kit");
        return;
      }
      showSuccess("Brand kit saved");
      onSave?.();
    } catch {
      showError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Palette className="h-5 w-5 text-brand-500" />
          <div>
            <CardTitle>Brand Kit</CardTitle>
            <CardDescription>
              Define your brand identity. This will be injected into all AI generations for consistency.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-muted">Company Name</label>
            <Input
              placeholder="e.g. Acme Inc."
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-muted">Logo URL</label>
            <Input
              placeholder="https://example.com/logo.png"
              value={form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-medium text-text-muted">
            <FileText className="h-3.5 w-3.5" />
            Company Description
          </label>
          <Textarea
            placeholder="Tell us about your company. What do you do? What makes you unique?"
            value={form.company_description}
            onChange={(e) => setForm({ ...form, company_description: e.target.value })}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-medium text-text-muted">
            <Users className="h-3.5 w-3.5" />
            Target Audience
          </label>
          <Textarea
            placeholder="Describe your target audience. E.g. 'B2B SaaS founders, 25-45, tech-savvy'"
            value={form.target_audience}
            onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-text-muted">Brand Colors</label>
          <div className="flex flex-wrap gap-3">
            {form.brand_colors.map((color, i) => (
              <div key={i} className="group relative flex items-center gap-2 rounded-lg border border-surface-3 px-3 py-1.5">
                <span className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: color }} />
                <span className="text-xs font-mono text-text-secondary">{color}</span>
                <button
                  type="button"
                  onClick={() => removeColor(i)}
                  className="ml-1 text-text-muted hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded border border-surface-3 bg-transparent"
            />
            <Input
              className="w-28 font-mono text-xs"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              placeholder="#6366F1"
            />
            <Button type="button" variant="outline" size="sm" onClick={addColor} disabled={!HEX_REGEX.test(newColor)}>
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-text-muted">Brand Voice</label>
          <Textarea
            placeholder="Describe your brand voice. E.g. 'Professional yet approachable. We use industry jargon sparingly and always explain concepts clearly.'"
            value={form.brand_voice}
            onChange={(e) => setForm({ ...form, brand_voice: e.target.value })}
            rows={3}
          />
          <p className="text-xs text-text-muted">
            This description will be injected into AI prompts to maintain consistent brand tone.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} loading={saving} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Brand Kit
              </>
            )}
          </Button>
          {form.company_name && (
            <p className="text-xs text-text-muted">
              Brand kit for <span className="font-medium text-text-primary">{form.company_name}</span> is active
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
