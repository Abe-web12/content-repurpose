"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, BookOpen, BarChart3, Activity, Download, Code, Terminal, Shield, Copy, Check } from "lucide-react";

function APIKeysPanel({ orgId }: { orgId?: string }) {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = async () => {
    if (!orgId) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/api-keys?orgId=${orgId}`);
      if (res.ok) {
        const json = await res.json();
        setKeys(json.data ?? []);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchKeys(); }, [orgId]);

  const createKey = async () => {
    if (!newKeyName || !orgId) return;
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, name: newKeyName }),
      });
      if (res.ok) {
        const json = await res.json();
        setNewKeyResult(json.data?.key || null);
        setNewKeyName("");
        fetchKeys();
      }
    } catch {}
  };

  const copyKey = () => {
    if (newKeyResult) {
      navigator.clipboard.writeText(newKeyResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-indigo-400" /> API Keys
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {newKeyResult && (
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
            <p className="mb-2 text-sm font-medium text-yellow-400">Save this key securely</p>
            <div className="flex items-center gap-2 rounded-md bg-gray-900 p-3">
              <code className="flex-1 break-all text-xs text-gray-300">{newKeyResult}</code>
              <Button variant="ghost" size="icon" onClick={copyKey}>
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="New key name..." />
          <Button onClick={createKey} disabled={!newKeyName || !orgId}>Create</Button>
        </div>

        {loading ? (
          <p className="py-4 text-center text-sm text-gray-500">Loading keys...</p>
        ) : keys.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">No API keys yet</p>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-200">{k.name}</span>
                    <code className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">{k.keyPrefix}...</code>
                    <Badge variant={k.isActive ? "default" : "secondary"} className={k.isActive ? "bg-green-500/10 text-green-400" : ""}>
                      {k.environment || "live"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {k.lastUsedAt ? `Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : "Never used"}
                    {k.dailyQuota && ` · ${k.dailyUsed}/${k.dailyQuota} daily`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UsagePanel({ orgId }: { orgId?: string }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    fetch(`/api/v1/analytics/usage?days=30`)
      .then((r) => r.json())
      .then((d) => setStats(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  if (loading) return <Card><CardContent className="py-8 text-center text-sm text-gray-500">Loading...</CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-400" /> API Usage
        </CardTitle>
      </CardHeader>
      <CardContent>
        {stats ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-white/5 p-3 text-center">
              <p className="text-2xl font-bold text-gray-200">{stats.totalRequests?.toLocaleString() || 0}</p>
              <p className="text-xs text-gray-500">Total Requests</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3 text-center">
              <p className="text-2xl font-bold text-green-400">{stats.successRate || "0"}%</p>
              <p className="text-xs text-gray-500">Success Rate</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3 text-center">
              <p className="text-2xl font-bold text-gray-200">{stats.avgDuration || 0}ms</p>
              <p className="text-xs text-gray-500">Avg Latency</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3 text-center">
              <p className="text-2xl font-bold text-red-400">{stats.errorCount || 0}</p>
              <p className="text-xs text-gray-500">Errors</p>
            </div>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-gray-500">No usage data yet</p>
        )}
      </CardContent>
    </Card>
  );
}

function LogsPanel({ orgId }: { orgId?: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    fetch("/api/v1/analytics/requests?per_page=20")
      .then((r) => r.json())
      .then((d) => setLogs(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  const statusColor = (s: number) =>
    s < 300 ? "text-green-400" : s < 500 ? "text-yellow-400" : "text-red-400";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-400" /> Recent Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-4 text-center text-sm text-gray-500">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">No requests yet</p>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/5">
                <span className="w-16 shrink-0 font-mono text-xs text-gray-500">{log.method}</span>
                <span className={`w-10 shrink-0 font-mono text-xs ${statusColor(log.status)}`}>{log.status}</span>
                <span className="flex-1 truncate text-gray-300">{log.path}</span>
                <span className="w-16 shrink-0 text-right font-mono text-xs text-gray-500">{log.duration}ms</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SDKPanel() {
  const [lang, setLang] = useState("typescript");
  const packages: Record<string, string> = {
    javascript: "npm install repurpose-ai",
    typescript: "npm install repurpose-ai",
    python: "pip install repurpose-ai",
    go: "go get github.com/repurpose-ai/repurposeai-go",
    php: "composer require repurpose-ai/repurpose-ai-php",
  };

  const [copiedCmd, setCopiedCmd] = useState(false);
  const copyCmd = () => {
    navigator.clipboard.writeText(packages[lang] || "");
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5 text-indigo-400" /> SDKs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {Object.keys(packages).map((l) => (
            <Button key={l} variant={lang === l ? "default" : "outline"} size="sm" onClick={() => setLang(l)}>
              <Code className="mr-1 h-4 w-4" /> {l === "typescript" ? "TypeScript" : l.charAt(0).toUpperCase() + l.slice(1)}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-md bg-gray-900 p-3">
          <Terminal className="h-4 w-4 text-gray-400" />
          <code className="flex-1 text-sm text-gray-300">{packages[lang]}</code>
          <Button variant="ghost" size="icon" onClick={copyCmd}>
            {copiedCmd ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <div className="rounded-lg border border-white/5 bg-white/5 p-4">
          <h4 className="mb-2 text-sm font-medium text-gray-300">Quick Start</h4>
          <pre className="overflow-x-auto text-xs text-gray-400">
            {lang === "typescript" ? `import RepurposeAI from "repurpose-ai";\n\nconst client = new RepurposeAI("rpai_your_api_key");\n\nconst { data } = await client.listGenerations();` :
             lang === "javascript" ? `const RepurposeAI = require("repurpose-ai");\n\nconst client = new RepurposeAI("rpai_your_api_key");\n\nclient.listGenerations().then(console.log);` :
             lang === "python" ? `from repurpose_ai import RepurposeAI\n\nclient = RepurposeAI("rpai_your_api_key")\ngenerations = client.list_generations()` :
             lang === "go" ? `import "github.com/repurpose-ai/repurposeai-go"\n\nclient := repurposeai.NewClient("rpai_your_api_key")\ngenerations, _ := client.ListGenerations(1, 20)` :
             `require 'vendor/autoload.php';\n\nuse RepurposeAI\\RepurposeAI;\n\n$client = new RepurposeAI("rpai_your_api_key");\n$generations = $client->listGenerations();`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}

function PlaygroundPanel() {
  const [endpoint, setEndpoint] = useState("/api/v1/generations");
  const [method, setMethod] = useState("GET");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const execute = async () => {
    setLoading(true);
    setResponse("");
    try {
      const res = await fetch(endpoint, { method });
      const text = await res.text();
      try {
        setResponse(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setResponse(text);
      }
    } catch (err: any) {
      setResponse(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-indigo-400" /> API Playground
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 outline-none"
          >
            <option>GET</option>
            <option>POST</option>
            <option>PATCH</option>
            <option>DELETE</option>
          </select>
          <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} className="flex-1" />
          <Button onClick={execute} disabled={loading}>{loading ? "..." : "Send"}</Button>
        </div>
        {response && (
          <pre className="max-h-96 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-300">{response}</pre>
        )}
      </CardContent>
    </Card>
  );
}

function AuthGuidePanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-400" /> Authentication Guide
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-gray-400">
        <div>
          <h4 className="mb-1 font-medium text-gray-200">API Key Authentication</h4>
          <p>All API requests require authentication via an API key. Include your key in the Authorization header:</p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-300">
            Authorization: Bearer rpai_your_api_key_here
          </pre>
        </div>
        <div>
          <h4 className="mb-1 font-medium text-gray-200">Getting an API Key</h4>
          <p>Generate API keys from the Developer Dashboard. Keys are prefixed with <code className="text-indigo-400">rpai_</code> for easy identification.</p>
        </div>
        <div>
          <h4 className="mb-1 font-medium text-gray-200">Rate Limiting</h4>
          <p>Rate limits vary by plan. Check the <code className="text-indigo-400">X-RateLimit-*</code> response headers for your current status.</p>
        </div>
        <div>
          <h4 className="mb-1 font-medium text-gray-200">Idempotency</h4>
          <p>POST and PATCH requests support idempotency via the <code className="text-indigo-400">Idempotency-Key</code> header. Keys expire after 24 hours.</p>
        </div>
        <div>
          <h4 className="mb-1 font-medium text-gray-200">Pagination</h4>
          <p>List endpoints support both page-based (<code className="text-indigo-400">page</code>, <code className="text-indigo-400">per_page</code>) and cursor-based (<code className="text-indigo-400">cursor</code>) pagination.</p>
        </div>
        <div>
          <h4 className="mb-1 font-medium text-gray-200">Errors</h4>
          <p>API errors return a JSON object with an <code className="text-indigo-400">error</code> field and appropriate HTTP status code.</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DevelopersPage() {
  const [orgId, setOrgId] = useState<string | undefined>();
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    fetch("/api/organizations")
      .then((r) => r.json())
      .then((d) => {
        const orgs = d.data ?? [];
        if (orgs.length > 0) setOrgId(orgs[0].id);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Developers</h1>
        <p className="mt-1 text-sm text-gray-500">Build with the RepurposeAI API</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="playground">Playground</TabsTrigger>
          <TabsTrigger value="sdk">SDKs</TabsTrigger>
          <TabsTrigger value="auth">Auth Guide</TabsTrigger>
          <TabsTrigger value="docs">Docs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <APIKeysPanel orgId={orgId} />
            <UsagePanel orgId={orgId} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <LogsPanel orgId={orgId} />
            <SDKPanel />
          </div>
        </TabsContent>

        <TabsContent value="api-keys" className="mt-6">
          <APIKeysPanel orgId={orgId} />
        </TabsContent>

        <TabsContent value="usage" className="mt-6">
          <UsagePanel orgId={orgId} />
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <LogsPanel orgId={orgId} />
        </TabsContent>

        <TabsContent value="playground" className="mt-6">
          <PlaygroundPanel />
        </TabsContent>

        <TabsContent value="sdk" className="mt-6">
          <SDKPanel />
        </TabsContent>

        <TabsContent value="auth" className="mt-6">
          <AuthGuidePanel />
        </TabsContent>

        <TabsContent value="docs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-400" /> API Documentation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                Browse the full API reference with interactive documentation:
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="/swagger" className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-400 hover:bg-indigo-500/20">
                  Swagger UI
                </a>
                <a href="/redoc" className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-400 hover:bg-indigo-500/20">
                  Redoc
                </a>
                <a href="/openapi.json" className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-400 hover:bg-indigo-500/20" target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" /> openapi.json
                </a>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/5 p-4">
                <h4 className="mb-2 text-sm font-medium text-gray-300">Event Types</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {["generation.created", "generation.completed", "generation.failed", "billing.updated", "subscription.updated", "credits.changed", "team.updated", "organization.updated", "referral.rewarded", "notification.created"].map((evt) => (
                    <code key={evt} className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-400">{evt}</code>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
