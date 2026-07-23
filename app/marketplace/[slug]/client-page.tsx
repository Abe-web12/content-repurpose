"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { showSuccess, showError } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Integration } from "@/lib/marketplace/integrations";
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Settings2,
  Plug,
  PlugZap,
  BookOpen,
  Activity,
  Shield,
  Gauge,
  Webhook,
  RefreshCw,
  Clock,
  FileText,
  ListChecks,
  Key,
  Globe,
  Server,
  Info,
  Copy,
  Check,
} from "lucide-react";

interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  dot: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  connected: {
    label: "Connected",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  disconnected: {
    label: "Disconnected",
    color: "text-gray-400",
    bg: "bg-gray-500/10 border-gray-500/20",
    dot: "bg-gray-400",
  },
  beta: {
    label: "Beta",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    dot: "bg-amber-400",
  },
  coming_soon: {
    label: "Coming Soon",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    dot: "bg-blue-400",
  },
  deprecated: {
    label: "Deprecated",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    dot: "bg-red-400",
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  "Social Media": "from-sky-500/20 to-blue-500/20 text-blue-400",
  Video: "from-red-500/20 to-rose-500/20 text-red-400",
  CMS: "from-emerald-500/20 to-teal-500/20 text-emerald-400",
  Communication: "from-violet-500/20 to-purple-500/20 text-violet-400",
  Automation: "from-orange-500/20 to-amber-500/20 text-orange-400",
  Storage: "from-cyan-500/20 to-indigo-500/20 text-cyan-400",
};

interface IntegrationDetailClientProps {
  integration: Integration;
}

interface ActivityLogEntry {
  id: number;
  action: string;
  timestamp: Date;
  status: "success" | "error" | "pending";
  details: string;
}

function generateMockActivity(): ActivityLogEntry[] {
  const now = new Date();
  return [
    { id: 1, action: "Content published", timestamp: new Date(now.getTime() - 1000 * 60 * 5), status: "success", details: "Blog post '10 AI Trends' published successfully" },
    { id: 2, action: "Connection verified", timestamp: new Date(now.getTime() - 1000 * 60 * 30), status: "success", details: "OAuth token refreshed successfully" },
    { id: 3, action: "Sync completed", timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 2), status: "success", details: "12 records synced, 0 errors" },
    { id: 4, action: "Rate limit warning", timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 5), status: "error", details: "API rate limit at 85% capacity" },
    { id: 5, action: "Content scheduled", timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 8), status: "success", details: "3 posts scheduled for next week" },
  ];
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffSecs < 30) return "just now";
  if (diffMins < 1) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] ?? STATUS_MAP.disconnected;
  return (
    <Badge variant="outline" className={cn("gap-1.5 px-3 py-1 text-xs font-medium", config.bg, config.color)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </Badge>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const gradient = CATEGORY_COLORS[category] ?? "from-gray-500/20 to-gray-500/20 text-gray-400";
  return (
    <Badge variant="outline" className={cn("border-white/5 bg-gradient-to-r", gradient)}>
      {category}
    </Badge>
  );
}

function FeatureList({ features }: { features: string[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {features.map((feature) => (
        <div key={feature} className="flex items-start gap-2.5 text-sm text-gray-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <span>{feature}</span>
        </div>
      ))}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showSuccess("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showError("Failed to copy");
    }
  }, [text]);

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleCopy}
      aria-label="Copy to clipboard"
      className="text-gray-500 hover:text-gray-300"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function ApiConfigurationCard({
  integration,
  connected,
  onConnect,
  onDisconnect,
}: {
  integration: Integration;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of integration.formFields) {
      initial[field.key] = "";
    }
    return initial;
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const allRequiredFilled = useMemo(() => {
    return integration.formFields.every((f) => !f.required || formValues[f.key]?.trim().length > 0);
  }, [integration.formFields, formValues]);

  const handleChange = useCallback((key: string, value: string) => {
    setFormValues((prev: Record<string, string>) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!allRequiredFilled) {
      showError("Please fill in all required fields");
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1500));
    setSaving(false);
    showSuccess(`${integration.name} configuration saved successfully`);
  }, [allRequiredFilled, integration.name]);

  const handleTestConnection = useCallback(async () => {
    setTesting(true);
    await new Promise((r) => setTimeout(r, 2000));
    setTesting(false);
    const success = Math.random() > 0.3;
    if (success) {
      showSuccess(`Connection to ${integration.name} verified successfully`);
    } else {
      showError(`Failed to connect to ${integration.name}. Check your credentials.`);
    }
  }, [integration.name]);

  const toggleSecret = useCallback((key: string) => {
    setShowSecrets((prev: Record<string, boolean>) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <Card className="border-white/10 bg-[#121624]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-indigo-400" />
            <CardTitle className="text-white">API Configuration</CardTitle>
          </div>
          <StatusBadge status={connected ? "connected" : "disconnected"} />
        </div>
        <CardDescription className="text-gray-400">
          Configure your {integration.name} API credentials
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {integration.oauthSupported && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-sm text-blue-300">
            <Info className="h-4 w-4 shrink-0" />
            <span>OAuth 2.0 is supported. You can also use the OAuth flow to connect instead of manual API keys.</span>
          </div>
        )}

        {integration.formFields.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Plug className="h-8 w-8 text-gray-500" />
            <p className="text-sm text-gray-400">No manual configuration required for this integration.</p>
            {integration.oauthSupported && (
              <Button variant="default" size="sm" onClick={onConnect} className="mt-2 bg-indigo-600 hover:bg-indigo-500">
                Connect with OAuth
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {integration.formFields.map((field) => {
                const isSecret = field.type === "password";
                const isVisible = showSecrets[field.key] ?? false;
                return (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={`field-${field.key}`} className="text-gray-300">
                      {field.label}
                      {field.required && <span className="ml-1 text-red-400">*</span>}
                    </Label>
                    <div className="relative">
                      <Input
                        id={`field-${field.key}`}
                        type={isSecret && !isVisible ? "password" : "text"}
                        placeholder={field.placeholder}
                        value={formValues[field.key]}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="border-white/10 bg-white/5 pr-8 text-gray-200 placeholder:text-gray-600 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                      />
                      {isSecret && formValues[field.key] && (
                        <button
                          type="button"
                          onClick={() => toggleSecret(field.key)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                          aria-label={isVisible ? "Hide secret" : "Show secret"}
                          tabIndex={-1}
                        >
                          {isVisible ? (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator className="bg-white/5" />

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={saving || !allRequiredFilled}
                className="bg-indigo-600 hover:bg-indigo-500"
              >
                {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Settings2 className="mr-1.5 h-4 w-4" />}
                Save Configuration
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testing || !allRequiredFilled}
                className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
              >
                {testing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Gauge className="mr-1.5 h-4 w-4" />}
                Test Connection
              </Button>
              {connected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDisconnect}
                  className="ml-auto border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <PlugZap className="mr-1.5 h-4 w-4" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onConnect}
                  disabled={!allRequiredFilled}
                  className="ml-auto bg-emerald-600 hover:bg-emerald-500"
                >
                  <Plug className="mr-1.5 h-4 w-4" />
                  Connect
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SetupGuideCard({ steps }: { steps: Integration["setupSteps"] }) {
  return (
    <Card className="border-white/10 bg-[#121624]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-indigo-400" />
          <CardTitle className="text-white">Setup Guide</CardTitle>
        </div>
        <CardDescription className="text-gray-400">
          Follow these steps to configure the integration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-semibold text-indigo-400">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{step.title}</p>
                <p className="mt-0.5 text-sm text-gray-400">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function RateLimitCard({ limits }: { limits: Integration["rateLimits"] }) {
  return (
    <Card className="border-white/10 bg-[#121624]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-indigo-400" />
          <CardTitle className="text-white">Rate Limits</CardTitle>
        </div>
        <CardDescription className="text-gray-400">API usage limits and restrictions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {limits.map((limit) => (
            <div
              key={`${limit.limit}-${limit.window}`}
              className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2"
            >
              <span className="text-sm text-gray-300">{limit.limit}</span>
              <span className="text-xs text-gray-500">{limit.window}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentationCard({ integration }: { integration: Integration }) {
  return (
    <Card className="border-white/10 bg-[#121624]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-400" />
          <CardTitle className="text-white">Documentation</CardTitle>
        </div>
        <CardDescription className="text-gray-400">Resources and reference links</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <a
          href={integration.documentationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2.5 text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <FileText className="h-4 w-4 shrink-0 text-indigo-400" />
          <span className="flex-1">API Documentation</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-500" />
        </a>
        {integration.website && (
          <a
            href={integration.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2.5 text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Globe className="h-4 w-4 shrink-0 text-indigo-400" />
            <span className="flex-1">{integration.website.replace(/https?:\/\//, "")}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-500" />
          </a>
        )}
        <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2.5 text-sm text-gray-300">
          <Server className="h-4 w-4 shrink-0 text-indigo-400" />
          <span className="flex-1">API Version: {integration.apiVersion}</span>
          <CopyButton text={integration.apiVersion} />
        </div>
      </CardContent>
    </Card>
  );
}

function RecentActivityCard({ logs }: { logs: ActivityLogEntry[] }) {
  return (
    <Card className="border-white/10 bg-[#121624]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-400" />
            <CardTitle className="text-white">Recent Activity</CardTitle>
          </div>
          <Button variant="ghost" size="icon-sm" className="text-gray-500 hover:text-gray-300" aria-label="Refresh activity">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-gray-400">Latest events and actions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5"
            >
              {log.status === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : log.status === "error" ? (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              ) : (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-200">{log.action}</p>
                <p className="text-xs text-gray-500">{log.details}</p>
              </div>
              <span className="shrink-0 text-xs text-gray-600">{formatRelativeTime(log.timestamp)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PermissionsCard({ permissions }: { permissions: string[] }) {
  return (
    <Card className="border-white/10 bg-[#121624]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-400" />
          <CardTitle className="text-white">Required Permissions</CardTitle>
        </div>
        <CardDescription className="text-gray-400">Scopes and access levels required</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {permissions.length > 0 ? (
            permissions.map((perm) => (
              <div key={perm} className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <code className="text-xs text-gray-300">{perm}</code>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No special permissions required for this integration.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SyncStatusCard({ integration, connected }: { integration: Integration; connected: boolean }) {
  const lastSync = connected ? new Date(Date.now() - 1000 * 60 * 60 * 2) : null;
  const [syncing, setSyncing] = useState(false);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 2000));
    setSyncing(false);
    showSuccess(`${integration.name} synced successfully`);
  }, [integration.name]);

  return (
    <Card className="border-white/10 bg-[#121624]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-indigo-400" />
          <CardTitle className="text-white">Sync Status</CardTitle>
        </div>
        <CardDescription className="text-gray-400">Data synchronization and health</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
          <span className="text-sm text-gray-300">Webhooks</span>
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 border px-2.5 py-0.5 text-xs",
              integration.webhooksSupported
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-gray-500/20 bg-gray-500/10 text-gray-400"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", integration.webhooksSupported ? "bg-emerald-400" : "bg-gray-400")} />
            {integration.webhooksSupported ? "Supported" : "Not Supported"}
          </Badge>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
          <span className="text-sm text-gray-300">OAuth 2.0</span>
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 border px-2.5 py-0.5 text-xs",
              integration.oauthSupported
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-gray-500/20 bg-gray-500/10 text-gray-400"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", integration.oauthSupported ? "bg-emerald-400" : "bg-gray-400")} />
            {integration.oauthSupported ? "Supported" : "Not Supported"}
          </Badge>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
          <span className="text-sm text-gray-300">API Key Auth</span>
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 border px-2.5 py-0.5 text-xs",
              integration.apiKeySupported
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-gray-500/20 bg-gray-500/10 text-gray-400"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", integration.apiKeySupported ? "bg-emerald-400" : "bg-gray-400")} />
            {integration.apiKeySupported ? "Supported" : "Not Supported"}
          </Badge>
        </div>

        {connected && (
          <>
            <Separator className="bg-white/5" />
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="h-3.5 w-3.5" />
                {lastSync ? `Last sync: ${formatRelativeTime(lastSync)}` : "Never synced"}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
              >
                {syncing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}
                Sync Now
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function IntegrationNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Integration Not Found</h1>
        <p className="mt-2 text-gray-400">
          The integration you are looking for does not exist or may have been removed from the marketplace.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Link href="/marketplace">
            <Button variant="default" className="bg-indigo-600 hover:bg-indigo-500">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Marketplace
            </Button>
          </Link>
          <Link href="/marketplace?search=">
            <Button variant="outline" className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white">
              Search Marketplace
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function IntegrationDetailClient({ integration }: IntegrationDetailClientProps) {
  const [connected, setConnected] = useState(integration.status === "connected");
  const activityLogs = useMemo(() => generateMockActivity(), []);

  const handleConnect = useCallback(() => {
    setConnected(true);
    showSuccess(`${integration.name} connected successfully`);
  }, [integration.name]);

  const handleDisconnect = useCallback(() => {
    setConnected(false);
    showSuccess(`${integration.name} disconnected successfully`);
  }, [integration.name]);

  return (
    <div className="min-h-screen bg-[#0a0d14]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Link>

        <div className="mt-6">
          <Card className="border-white/10 bg-[#121624]">
            <CardContent className="p-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${integration.color}15` }}
                  >
                    <span className="text-2xl font-bold" style={{ color: integration.color }}>
                      {integration.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-2xl font-bold text-white">{integration.name}</h1>
                      <StatusBadge status={connected ? "connected" : integration.status} />
                      <CategoryBadge category={integration.category} />
                    </div>
                    <p className="mt-2 max-w-2xl text-gray-400">{integration.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Settings2 className="h-3.5 w-3.5" />
                        {integration.pricing}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Server className="h-3.5 w-3.5" />
                        API {integration.apiVersion}
                      </span>
                      {connected && (
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {connected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnect}
                      className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <PlugZap className="mr-1.5 h-4 w-4" />
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleConnect}
                      className="bg-emerald-600 hover:bg-emerald-500"
                    >
                      <Plug className="mr-1.5 h-4 w-4" />
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Card className="border-white/10 bg-[#121624]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                <CardTitle className="text-white">Overview</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-gray-300">{integration.longDescription}</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Card className="border-white/10 bg-[#121624]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-indigo-400" />
                <CardTitle className="text-white">Capabilities</CardTitle>
              </div>
              <CardDescription className="text-gray-400">Supported features and functionality</CardDescription>
            </CardHeader>
            <CardContent>
              <FeatureList features={integration.supportedFeatures} />
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <ApiConfigurationCard
              integration={integration}
              connected={connected}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />

            <SetupGuideCard steps={integration.setupSteps} />

            <RecentActivityCard logs={activityLogs} />
          </div>

          <aside className="space-y-6">
            <PermissionsCard permissions={integration.permissions} />

            <SyncStatusCard integration={integration} connected={connected} />

            <RateLimitCard limits={integration.rateLimits} />

            <DocumentationCard integration={integration} />

            <Card className="border-white/10 bg-[#121624]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Webhook className="h-5 w-5 text-indigo-400" />
                  <CardTitle className="text-white">Webhooks</CardTitle>
                </div>
                <CardDescription className="text-gray-400">Real-time event notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Webhook Support</span>
                  <Switch
                    checked={integration.webhooksSupported}
                    onCheckedChange={() => {}}
                    disabled={!integration.webhooksSupported}
                  />
                </div>
                {integration.webhooksSupported && (
                  <p className="mt-3 text-xs text-gray-500">
                    Configure webhooks to receive real-time events and notifications from {integration.name}.
                  </p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

export { IntegrationNotFound };