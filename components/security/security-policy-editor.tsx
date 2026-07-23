"use client";

import { useState, useEffect } from "react";
import { useSecurityPolicy, useUpdateSecurityPolicy } from "@/hooks/use-security";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Save } from "lucide-react";

interface SecurityPolicyEditorProps {
  orgId: string;
}

export function SecurityPolicyEditor({ orgId }: SecurityPolicyEditorProps) {
  const { policy, loading, refetch } = useSecurityPolicy(orgId);
  const { update } = useUpdateSecurityPolicy();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (policy) setForm({ ...policy });
  }, [policy]);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-indigo-400" />Security Policy</CardTitle></CardHeader>
        <CardContent><div className="flex items-center justify-center py-8 text-sm text-gray-500">Loading policy...</div></CardContent>
      </Card>
    );
  }

  if (!form) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-indigo-400" />Security Policy</CardTitle></CardHeader>
        <CardContent><div className="flex items-center justify-center py-8 text-sm text-gray-500">No policy configured</div></CardContent>
      </Card>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await update(orgId, form);
      refetch();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-400" />
          Security Policy
        </CardTitle>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : "Save"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-300">Password Requirements</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Min Password Length</Label>
              <Input type="number" value={form.minPasswordLength} onChange={(e) => setForm({ ...form, minPasswordLength: parseInt(e.target.value) || 8 })} min={6} max={128} />
            </div>
            <div className="flex items-end gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.requireUppercase} onCheckedChange={(v) => setForm({ ...form, requireUppercase: v })} />
                <Label>Uppercase</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.requireNumbers} onCheckedChange={(v) => setForm({ ...form, requireNumbers: v })} />
                <Label>Numbers</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.requireSpecialChars} onCheckedChange={(v) => setForm({ ...form, requireSpecialChars: v })} />
                <Label>Special</Label>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-300">Login Security</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Max Login Attempts</Label>
              <Input type="number" value={form.maxLoginAttempts} onChange={(e) => setForm({ ...form, maxLoginAttempts: parseInt(e.target.value) || 5 })} min={1} max={50} />
            </div>
            <div>
              <Label>Lockout Duration (minutes)</Label>
              <Input type="number" value={form.lockoutDurationMinutes} onChange={(e) => setForm({ ...form, lockoutDurationMinutes: parseInt(e.target.value) || 15 })} min={1} max={1440} />
            </div>
            <div>
              <Label>Session Timeout (minutes)</Label>
              <Input type="number" value={form.sessionTimeoutMinutes} onChange={(e) => setForm({ ...form, sessionTimeoutMinutes: parseInt(e.target.value) || 60 })} min={5} max={43200} />
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-2">
                <Switch checked={form.requireMfa} onCheckedChange={(v) => setForm({ ...form, requireMfa: v })} />
                <Label>Require MFA</Label>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-300">Access Restrictions</h4>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch checked={form.ipAllowlistEnabled} onCheckedChange={(v) => setForm({ ...form, ipAllowlistEnabled: v })} />
              <Label>IP Allowlist</Label>
            </div>
            {form.ipAllowlistEnabled && (
              <div>
                <Label>Allowed IP Ranges (CIDR, one per line)</Label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
                  rows={3}
                  value={form.allowedIpRanges?.join("\n") || ""}
                  onChange={(e) => setForm({ ...form, allowedIpRanges: e.target.value.split("\n").filter(Boolean) })}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={form.domainAllowlistEnabled} onCheckedChange={(v) => setForm({ ...form, domainAllowlistEnabled: v })} />
              <Label>Domain Allowlist</Label>
            </div>
            {form.domainAllowlistEnabled && (
              <div>
                <Label>Allowed Email Domains (one per line)</Label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
                  rows={3}
                  value={form.allowedEmailDomains?.join("\n") || ""}
                  onChange={(e) => setForm({ ...form, allowedEmailDomains: e.target.value.split("\n").filter(Boolean) })}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={form.countryAllowlistEnabled} onCheckedChange={(v) => setForm({ ...form, countryAllowlistEnabled: v })} />
              <Label>Country Allowlist</Label>
            </div>
            {form.countryAllowlistEnabled && (
              <div>
                <Label>Allowed Countries (ISO codes, one per line)</Label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
                  rows={3}
                  value={form.allowedCountries?.join("\n") || ""}
                  onChange={(e) => setForm({ ...form, allowedCountries: e.target.value.split("\n").filter(Boolean) })}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
