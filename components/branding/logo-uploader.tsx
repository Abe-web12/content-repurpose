"use client";

import { useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LogoUploaderProps {
  label: string;
  description: string;
  value: string | null;
  onChange: (url: string | null) => void;
}

export function LogoUploader({ label, description, value, onChange }: LogoUploaderProps) {
  const [url, setUrl] = useState(value || "");
  const [previewError, setPreviewError] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          {label}
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {value && !previewError ? (
          <div className="relative rounded-lg border bg-muted/30 p-4 flex items-center justify-center">
            <img src={value} alt={label} className="max-h-16 object-contain" onError={() => setPreviewError(true)} />
            <Button variant="ghost" size="icon" className="absolute top-1 right-1" onClick={() => { onChange(null); setUrl(""); setPreviewError(false); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/20 p-6 flex flex-col items-center gap-2">
            <Upload className="h-6 w-6 text-text-muted" />
            <p className="text-xs text-text-muted text-center">Paste a URL or upload</p>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com/logo.png"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="text-sm"
          />
          <Button variant="outline" size="sm" onClick={() => { onChange(url || null); setPreviewError(false); }} disabled={!url}>
            Apply
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
