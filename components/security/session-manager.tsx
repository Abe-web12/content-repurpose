"use client";

import { useSessions, useSessionActions } from "@/hooks/use-security";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Smartphone, Globe, Shield, ShieldOff, LogOut, CheckCircle, XCircle } from "lucide-react";

export function SessionManager() {
  const { sessions, stats, loading, refetch } = useSessions();
  const { execute } = useSessionActions();

  const handleAction = async (action: string, sessionId?: string) => {
    await execute(action, sessionId);
    refetch();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-indigo-400" />
          Active Sessions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-white/5 p-3 text-center">
              <p className="text-2xl font-bold text-gray-200">{stats.totalSessions}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3 text-center">
              <p className="text-2xl font-bold text-green-400">{stats.activeToday}</p>
              <p className="text-xs text-gray-500">Active Today</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3 text-center">
              <p className="text-2xl font-bold text-indigo-400">{stats.trustedDevices}</p>
              <p className="text-xs text-gray-500">Trusted</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3 text-center">
              <p className="text-2xl font-bold text-red-400">{stats.blockedDevices}</p>
              <p className="text-xs text-gray-500">Blocked</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-6 text-sm text-gray-500">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-sm text-gray-500">
            <Monitor className="mb-2 h-8 w-8 text-gray-400" />
            <p>No active sessions</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">
                        {s.deviceInfo || "Unknown Device"}
                      </span>
                      {s.isTrusted && (
                        <Badge variant="default" className="bg-green-500/10 text-green-400">
                          <CheckCircle className="mr-1 h-3 w-3" /> Trusted
                        </Badge>
                      )}
                      {s.isBlocked && (
                        <Badge variant="default" className="bg-red-500/10 text-red-400">
                          <XCircle className="mr-1 h-3 w-3" /> Blocked
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {s.location ? `${s.location} · ` : ""}
                      {s.ipAddress || "Unknown IP"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!s.isBlocked && (
                    <>
                      {!s.isTrusted ? (
                        <Button variant="ghost" size="icon" onClick={() => handleAction("trust", s.id)} title="Trust device">
                          <Shield className="h-4 w-4 text-green-400" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => handleAction("block", s.id)} title="Block device">
                          <ShieldOff className="h-4 w-4 text-red-400" />
                        </Button>
                      )}
                    </>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => handleAction("logout", s.id)} title="Logout session">
                    <LogOut className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {sessions.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-red-400 hover:text-red-300"
            onClick={() => handleAction("logout_all")}
          >
            <LogOut className="mr-2 h-4 w-4" /> Logout All Other Sessions
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
