"use client";

import { useState } from "react";
import { useSSOProviders, useCreateSSOProvider } from "@/hooks/use-security";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Plus, Check, X } from "lucide-react";

interface SSOSettingsProps {
  orgId: string;
}

export function SSOSettings({ orgId }: SSOSettingsProps) {
  const { providers, loading, refetch } = useSSOProviders(orgId);
  const { create } = useCreateSSOProvider();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ providerType: "", clientId: "", clientSecret: "", issuerUrl: "", domains: "" });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await create(orgId, {
        ...form,
        domains: form.domains.split(",").map((d: string) => d.trim()).filter(Boolean),
      });
      setOpen(false);
      setForm({ providerType: "", clientId: "", clientSecret: "", issuerUrl: "", domains: "" });
      refetch();
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-400" />
          SSO Providers
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Provider</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add SSO Provider</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Provider Type</Label>
                <Select value={form.providerType} onValueChange={(v) => setForm({ ...form, providerType: v })}>
                  <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GOOGLE_WORKSPACE">Google Workspace</SelectItem>
                    <SelectItem value="MICROSOFT_ENTRA">Microsoft Entra ID</SelectItem>
                    <SelectItem value="OKTA">Okta</SelectItem>
                    <SelectItem value="CUSTOM_SAML">Custom SAML 2.0</SelectItem>
                    <SelectItem value="CUSTOM_OIDC">Custom OIDC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Client ID</Label>
                <Input value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} />
              </div>
              <div>
                <Label>Client Secret</Label>
                <Input type="password" value={form.clientSecret} onChange={(e) => setForm({ ...form, clientSecret: e.target.value })} />
              </div>
              <div>
                <Label>Issuer URL</Label>
                <Input value={form.issuerUrl} onChange={(e) => setForm({ ...form, issuerUrl: e.target.value })} placeholder="https://accounts.example.com" />
              </div>
              <div>
                <Label>Allowed Domains (comma separated)</Label>
                <Input value={form.domains} onChange={(e) => setForm({ ...form, domains: e.target.value })} placeholder="example.com, mycorp.com" />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={creating || !form.providerType || !form.clientId}>
                {creating ? "Creating..." : "Add Provider"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-500">Loading providers...</div>
        ) : providers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-sm text-gray-500">
            <Shield className="mb-2 h-8 w-8 text-gray-400" />
            <p>No SSO providers configured</p>
            <p className="mt-1 text-xs">Connect your identity provider for single sign-on</p>
          </div>
        ) : (
          <div className="space-y-3">
            {providers.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-200">{p.providerType.replace(/_/g, " ")}</span>
                    {p.isActive ? (
                      <Badge variant="default" className="bg-green-500/10 text-green-400">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">Client ID: {p.clientId}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {p.domains?.length ? (
                    <span>{p.domains.length} domain{p.domains.length > 1 ? "s" : ""}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
