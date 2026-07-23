"use client";

import { useState } from "react";
import { useAPIKeys, useAPIKeyActions } from "@/hooks/use-security";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Key, Plus, Copy, RotateCcw, Trash2, Check } from "lucide-react";
import { showError } from "@/components/ui/toast";

interface APIKeyManagerProps {
  orgId: string;
}

export function APIKeyManager({ orgId }: APIKeyManagerProps) {
  const { keys, loading, refetch } = useAPIKeys(orgId);
  const { create, revoke, rotate } = useAPIKeyActions();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [rotating, setRotating] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name) return;
    setCreating(true);
    try {
      const result = await create(orgId, { name });
      setNewKey(result.data?.key || null);
      refetch();
    } finally {
      setCreating(false);
    }
  };

  const handleRotate = async (keyId: string) => {
    setRotating(keyId);
    try {
      const result = await rotate(keyId);
      setNewKey(result.data?.key || null);
      refetch();
    } finally {
      setRotating(null);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    showError("API key copied to clipboard");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-indigo-400" />
          API Keys
        </CardTitle>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setNewKey(null); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Create Key</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{newKey ? "API Key Created" : "Create API Key"}</DialogTitle>
            </DialogHeader>
            {newKey ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
                  <p className="mb-2 text-sm font-medium text-yellow-400">Save this key — it won&apos;t be shown again</p>
                  <div className="flex items-center gap-2 rounded-md bg-gray-900 p-3">
                    <code className="flex-1 text-xs text-gray-300 break-all">{newKey}</code>
                    <Button variant="ghost" size="icon" onClick={() => copyKey(newKey)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button className="w-full" onClick={() => { setOpen(false); setNewKey(null); setName(""); }}>
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Key Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Production API" />
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={creating || !name}>
                  {creating ? "Creating..." : "Create API Key"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-500">Loading API keys...</div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-sm text-gray-500">
            <Key className="mb-2 h-8 w-8 text-gray-400" />
            <p>No API keys created</p>
            <p className="mt-1 text-xs">Create an API key to integrate with external services</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-200">{k.name}</span>
                    <code className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">{k.keyPrefix}...</code>
                    {k.isActive ? (
                      <Badge variant="default" className="bg-green-500/10 text-green-400">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Revoked</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {k.lastUsedAt
                      ? `Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                      : "Never used"}
                    {k.expiresAt && ` · Expires ${new Date(k.expiresAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {k.isActive && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => handleRotate(k.id)} disabled={rotating === k.id} title="Rotate key">
                        <RotateCcw className="h-4 w-4 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => revoke(k.id)} title="Revoke key">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
