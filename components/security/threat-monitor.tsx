"use client";

import { useState } from "react";
import { useThreats, useSecurityScore, useResolveThreat } from "@/hooks/use-security";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Shield, ShieldAlert, CheckCircle, Siren } from "lucide-react";

interface ThreatMonitorProps {
  orgId?: string;
}

const severityColors: Record<string, string> = {
  LOW: "bg-yellow-500/10 text-yellow-400",
  MEDIUM: "bg-orange-500/10 text-orange-400",
  HIGH: "bg-red-500/10 text-red-400",
  CRITICAL: "bg-red-500/20 text-red-300",
};

const typeIcons: Record<string, React.ReactNode> = {
  brute_force: <Siren className="h-4 w-4 text-red-400" />,
  impossible_travel: <ShieldAlert className="h-4 w-4 text-orange-400" />,
  suspicious_login: <AlertTriangle className="h-4 w-4 text-yellow-400" />,
};

export function ThreatMonitor({ orgId }: ThreatMonitorProps) {
  const [resolvedFilter, setResolvedFilter] = useState<string>("false");
  const { threats, loading, refetch } = useThreats(orgId, resolvedFilter === "true" ? true : resolvedFilter === "false" ? false : undefined);
  const { score } = useSecurityScore(orgId);
  const { resolve } = useResolveThreat();
  const [resolving, setResolving] = useState<string | null>(null);

  const handleResolve = async (threatId: string) => {
    setResolving(threatId);
    try {
      await resolve(threatId);
      refetch();
    } finally {
      setResolving(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-400" />
          Threat Detection
          {score !== null && (
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
              score >= 80 ? "bg-green-500/10 text-green-400" :
              score >= 50 ? "bg-yellow-500/10 text-yellow-400" :
              "bg-red-500/10 text-red-400"
            }`}>
              Score: {score}
            </span>
          )}
        </CardTitle>
        <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="false">Unresolved</SelectItem>
            <SelectItem value="true">Resolved</SelectItem>
            <SelectItem value="">All</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-500">Loading threats...</div>
        ) : threats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-sm text-gray-500">
            <Shield className="mb-2 h-8 w-8 text-green-400" />
            <p>No threats detected</p>
            <p className="mt-1 text-xs">Your account is secure</p>
          </div>
        ) : (
          <div className="space-y-2">
            {threats.map((t) => (
              <div key={t.id} className="flex items-start justify-between rounded-lg border border-white/5 bg-white/5 px-4 py-3">
                <div className="flex items-start gap-3">
                  {typeIcons[t.type] || <AlertTriangle className="mt-0.5 h-4 w-4 text-gray-400" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">{t.type.replace(/_/g, " ")}</span>
                      <Badge variant="default" className={severityColors[t.severity] || ""}>{t.severity}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {t.ipAddress ? `IP: ${t.ipAddress} · ` : ""}
                      {new Date(t.createdAt).toLocaleString()}
                    </p>
                    {t.details?.reason && (
                      <p className="mt-1 text-xs text-gray-400">{t.details.reason}</p>
                    )}
                  </div>
                </div>
                {!t.resolved && (
                  <Button variant="ghost" size="sm" onClick={() => handleResolve(t.id)} disabled={resolving === t.id}>
                    <CheckCircle className="mr-1 h-4 w-4 text-green-400" />
                    {resolving === t.id ? "..." : "Resolve"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
