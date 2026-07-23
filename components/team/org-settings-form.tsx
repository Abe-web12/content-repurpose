"use client";

import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OrgSettingsFormProps {
  org: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    timezone: string;
    brandColor: string | null;
    domain: string | null;
    maxSeats: number;
  };
  onSave: (data: any) => Promise<void>;
}

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai",
  "Asia/Kolkata", "Australia/Sydney", "Pacific/Auckland",
];

export function OrgSettingsForm({ org, onSave }: OrgSettingsFormProps) {
  const [name, setName] = useState(org.name);
  const [timezone, setTimezone] = useState(org.timezone);
  const [brandColor, setBrandColor] = useState(org.brandColor || "");
  const [domain, setDomain] = useState(org.domain || "");
  const [maxSeats, setMaxSeats] = useState(org.maxSeats.toString());
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await onSave({ name, timezone, brandColor: brandColor || undefined, domain: domain || undefined, maxSeats: parseInt(maxSeats) });
      setSuccess(true);
    } catch {} finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Organization Settings</CardTitle>
        <CardDescription>Manage your organization details</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-text-primary">Organization Name</label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <label htmlFor="slug" className="text-sm font-medium text-text-primary">Slug</label>
            <Input id="slug" value={org.slug} disabled className="bg-muted" />
            <p className="text-xs text-text-muted">Slug cannot be changed</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="timezone" className="text-sm font-medium text-text-primary">Timezone</label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="brandColor" className="text-sm font-medium text-text-primary">Brand Color</label>
            <div className="flex gap-2">
              <Input id="brandColor" type="color" value={brandColor || "#6366f1"} onChange={(e) => setBrandColor(e.target.value)} className="w-16 p-1" />
              <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} placeholder="#6366f1" />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="domain" className="text-sm font-medium text-text-primary">Domain</label>
            <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="company.com" />
            <p className="text-xs text-text-muted">Verified domain for auto-join</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="maxSeats" className="text-sm font-medium text-text-primary">Maximum Seats</label>
            <Input id="maxSeats" type="number" min={1} max={100} value={maxSeats} onChange={(e) => setMaxSeats(e.target.value)} />
          </div>

          {success && <p className="text-sm text-green-600">Settings saved successfully!</p>}

          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
