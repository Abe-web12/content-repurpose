"use client";

import { Paintbrush } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ColorEditorProps {
  brandColor: string;
  secondaryColor: string;
  accentColor: string;
  onChange: (colors: { brandColor: string; secondaryColor: string; accentColor: string }) => void;
}

export function ColorEditor({ brandColor, secondaryColor, accentColor, onChange }: ColorEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Paintbrush className="h-4 w-4" />
          Brand Colors
        </CardTitle>
        <CardDescription>Customize your organization color scheme</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">Primary Color</label>
          <div className="flex gap-2">
            <Input type="color" value={brandColor} onChange={(e) => onChange({ brandColor: e.target.value, secondaryColor, accentColor })} className="w-12 p-1" />
            <Input value={brandColor} onChange={(e) => onChange({ brandColor: e.target.value, secondaryColor, accentColor })} placeholder="#6366f1" />
          </div>
          <div className="h-8 rounded-lg border" style={{ backgroundColor: brandColor }} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">Secondary Color</label>
          <div className="flex gap-2">
            <Input type="color" value={secondaryColor} onChange={(e) => onChange({ brandColor, secondaryColor: e.target.value, accentColor })} className="w-12 p-1" />
            <Input value={secondaryColor} onChange={(e) => onChange({ brandColor, secondaryColor: e.target.value, accentColor })} placeholder="#4f46e5" />
          </div>
          <div className="h-8 rounded-lg border" style={{ backgroundColor: secondaryColor }} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">Accent Color</label>
          <div className="flex gap-2">
            <Input type="color" value={accentColor} onChange={(e) => onChange({ brandColor, secondaryColor, accentColor: e.target.value })} className="w-12 p-1" />
            <Input value={accentColor} onChange={(e) => onChange({ brandColor, secondaryColor, accentColor: e.target.value })} placeholder="#10b981" />
          </div>
          <div className="h-8 rounded-lg border" style={{ backgroundColor: accentColor }} />
        </div>
      </CardContent>
    </Card>
  );
}
