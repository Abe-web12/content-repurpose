"use client";

import { useAuditLogs } from "@/hooks/use-security";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, FileText, User, Settings, Shield } from "lucide-react";
import { useState } from "react";

interface AuditLogViewerProps {
  orgId?: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  user_login: <User className="h-4 w-4 text-blue-400" />,
  user_logout: <User className="h-4 w-4 text-gray-400" />,
  member_added: <User className="h-4 w-4 text-green-400" />,
  member_removed: <User className="h-4 w-4 text-red-400" />,
  role_changed: <Shield className="h-4 w-4 text-indigo-400" />,
  org_updated: <Settings className="h-4 w-4 text-yellow-400" />,
  api_key_created: <FileText className="h-4 w-4 text-purple-400" />,
  api_key_revoked: <FileText className="h-4 w-4 text-red-400" />,
  policy_updated: <Shield className="h-4 w-4 text-cyan-400" />,
  sso_configured: <Shield className="h-4 w-4 text-indigo-400" />,
};

const severityColors: Record<string, string> = {
  INFO: "bg-blue-500/10 text-blue-400",
  WARNING: "bg-yellow-500/10 text-yellow-400",
  ERROR: "bg-red-500/10 text-red-400",
  CRITICAL: "bg-red-500/20 text-red-300",
};

export function AuditLogViewer({ orgId }: AuditLogViewerProps) {
  const [actionFilter, setActionFilter] = useState("");
  const { logs, loading } = useAuditLogs(orgId, { action: actionFilter || undefined });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-400" />
            Audit Log
          </span>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Actions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Actions</SelectItem>
              <SelectItem value="user_login">Login</SelectItem>
              <SelectItem value="user_logout">Logout</SelectItem>
              <SelectItem value="member_added">Member Added</SelectItem>
              <SelectItem value="member_removed">Member Removed</SelectItem>
              <SelectItem value="role_changed">Role Changed</SelectItem>
              <SelectItem value="org_updated">Org Updated</SelectItem>
              <SelectItem value="policy_updated">Policy Updated</SelectItem>
              <SelectItem value="api_key_created">API Key Created</SelectItem>
              <SelectItem value="api_key_revoked">API Key Revoked</SelectItem>
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-500">Loading audit log...</div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-sm text-gray-500">
            <History className="mb-2 h-8 w-8 text-gray-400" />
            <p>No audit log entries</p>
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/5">
                <div className="mt-0.5 shrink-0">
                  {actionIcons[log.action] || <FileText className="h-4 w-4 text-gray-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-gray-200">{log.action.replace(/_/g, " ")}</span>
                  {log.entityType && (
                    <span className="ml-1 text-gray-500">
                      on {log.entityType}{log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}
                    </span>
                  )}
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                    {log.ipAddress && <span>· {log.ipAddress}</span>}
                    {log.metadata?.severity && (
                      <Badge variant="default" className={severityColors[log.metadata.severity] || ""}>
                        {log.metadata.severity}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
