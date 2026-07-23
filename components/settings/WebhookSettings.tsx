"use client";

import { useState, useEffect } from "react";
import { Webhook, Loader2, Check, Send, Plug } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showError, showSuccess } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const TRIGGER_EVENTS = [
  { value: "generation.completed", label: "Generation Completed" },
  { value: "schedule.created", label: "Post Scheduled" },
  { value: "scheduled.posted", label: "Scheduled Post Published" },
  { value: "content.published", label: "Content Published" },
] as const;

interface WebhookConfig {
  url: string;
  secret: string;
  is_active: boolean;
  trigger_events: string[];
}

export function WebhookSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [form, setForm] = useState<WebhookConfig>({
    url: "",
    secret: "",
    is_active: true,
    trigger_events: ["generation.completed"],
  });
  const [urlError, setUrlError] = useState("");

  useEffect(() => {
    async function fetchWebhook() {
      setLoading(true);
      try {
        const res = await fetch("/api/settings/webhooks");
        const json = await res.json();
        if (json.data) {
          setExistingId(json.data.id);
          setForm({
            url: json.data.url || "",
            secret: json.data.secret || "",
            is_active: json.data.is_active ?? true,
            trigger_events: json.data.trigger_events || ["generation.completed"],
          });
        }
      } catch {
        // No existing webhook — show empty form
      } finally {
        setLoading(false);
      }
    }
    fetchWebhook();
  }, []);

  function validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  function handleUrlChange(value: string) {
    setForm({ ...form, url: value });
    if (value && !validateUrl(value)) {
      setUrlError("Enter a valid http or https URL");
    } else {
      setUrlError("");
    }
  }

  function toggleEvent(event: string) {
    setForm({
      ...form,
      trigger_events: form.trigger_events.includes(event)
        ? form.trigger_events.filter((e) => e !== event)
        : [...form.trigger_events, event],
    });
  }

  async function handleSave() {
    if (!validateUrl(form.url)) {
      setUrlError("Enter a valid http or https URL");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/webhooks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        showError(json.error || "Failed to save webhook");
        return;
      }
      setExistingId(json.data.id);
      showSuccess("Webhook saved");
    } catch {
      showError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!validateUrl(form.url)) {
      setUrlError("Enter a valid http or https URL");
      return;
    }

    setTesting(true);
    try {
      const res = await fetch("/api/settings/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.url, secret: form.secret }),
      });
      const json = await res.json();
      if (!res.ok) {
        showError(json.error || "Test failed");
        return;
      }
      showSuccess("Test successful — endpoint responded correctly");
    } catch {
      showError("Something went wrong");
    } finally {
      setTesting(false);
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
          <Webhook className="h-5 w-5 text-brand-500" />
          <div>
            <CardTitle>Webhook Integration</CardTitle>
            <CardDescription>
              Connect RepurposeAI to your own backend or automation platform (Make.com, Zapier, etc.).
              {existingId && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                  <Plug className="h-3 w-3" />
                  Configured
                </span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-muted">Webhook URL</label>
          <Input
            placeholder="https://your-app.com/api/webhooks/repurposeai"
            value={form.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            error={urlError}
          />
          <p className="text-xs text-text-muted">
            RepurposeAI will send POST requests to this URL when events occur.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-text-muted">
            Secret <span className="text-text-muted/60">(optional)</span>
          </label>
          <Input
            type="password"
            placeholder="Used for HMAC signature verification"
            value={form.secret}
            onChange={(e) => setForm({ ...form, secret: e.target.value })}
          />
          <p className="text-xs text-text-muted">
            If provided, each request will include an{" "}
            <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">X-Signature-256</code> header.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-text-muted">Active</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.is_active}
              aria-label="Toggle webhook active"
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200",
                "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2",
                form.is_active ? "bg-brand-600" : "bg-surface-3",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
                  form.is_active ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
            <span className="text-sm text-text-primary">
              {form.is_active ? "Webhook is active and will receive events" : "Webhook is paused"}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-text-muted">Trigger Events</label>
          <div className="space-y-2">
            {TRIGGER_EVENTS.map((event) => (
              <label
                key={event.value}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-surface-2 px-3 py-2 transition-colors hover:bg-surface-1"
              >
                <input
                  type="checkbox"
                  checked={form.trigger_events.includes(event.value)}
                  onChange={() => toggleEvent(event.value)}
                  className="h-4 w-4 rounded border-surface-3 text-brand-600 focus:ring-brand-500/20"
                />
                <span className="text-sm text-text-primary">{event.label}</span>
              </label>
            ))}
          </div>
          {form.trigger_events.length === 0 && (
            <p className="text-xs text-red-600">Select at least one event</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={saving || testing}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {existingId ? "Update webhook" : "Save webhook"}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleTest}
            loading={testing}
            disabled={testing || saving || !form.url}
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Test connection
              </>
            )}
          </Button>
          {existingId && (
            <p className="text-xs text-text-muted">
              Webhook will fire on {form.trigger_events.length} event{form.trigger_events.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
