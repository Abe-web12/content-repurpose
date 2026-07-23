"use client";

import { useState } from "react";
import { Globe, CheckCircle2, XCircle, Loader2, Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface DNSRecord {
  type: string;
  name: string;
  value: string;
  purpose: string;
}

interface DomainManagerProps {
  domain: { domain: string | null; domainVerified: boolean; sslStatus: string | null; isPrimaryDomain: boolean } | null;
  dnsInstructions: DNSRecord[] | null;
  onUpdate: (domain: string) => Promise<boolean>;
  onRemove: () => Promise<boolean>;
}

export function DomainManager({ domain, dnsInstructions, onUpdate, onRemove }: DomainManagerProps) {
  const [newDomain, setNewDomain] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newDomain.trim()) return;
    setSaving(true);
    await onUpdate(newDomain.trim());
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Custom Domain
        </CardTitle>
        <CardDescription>Connect your own domain for a white-label experience</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {domain?.domain ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-text-muted" />
                <span className="font-medium text-sm">{domain.domain}</span>
              </div>
              <div className="flex items-center gap-2">
                {domain.domainVerified ? (
                  <Badge variant="default" className="bg-green-100 text-green-800 border-green-300 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <XCircle className="h-3 w-3" /> Unverified
                  </Badge>
                )}
                <Button variant="ghost" size="icon" onClick={onRemove}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>

            {!domain.domainVerified && dnsInstructions && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-text-primary">DNS Configuration</p>
                <p className="text-xs text-text-muted">Add these DNS records to verify domain ownership:</p>
                <div className="space-y-2">
                  {dnsInstructions.map((record, i) => (
                    <div key={i} className="rounded-lg border bg-muted/20 p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-mono">{record.type}</Badge>
                        <span className="text-xs text-text-muted">{record.purpose}</span>
                      </div>
                      <p className="text-xs font-mono text-text-primary break-all"><span className="text-text-muted">Name:</span> {record.name}</p>
                      <p className="text-xs font-mono text-text-primary break-all"><span className="text-text-muted">Value:</span> {record.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {domain.domainVerified && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                <p className="text-sm text-green-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Domain verified! SSL status: {domain.sslStatus || "active"}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 text-center">
            <Globe className="h-8 w-8 text-text-muted mb-2" />
            <p className="text-sm text-text-muted mb-4">No custom domain configured</p>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="example.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
          />
          <Button onClick={handleAdd} disabled={saving || !newDomain.trim()} className="gap-2 shrink-0">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Domain
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
