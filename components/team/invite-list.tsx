"use client";

import { Mail, Clock, XCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Invite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: { id: string; fullName: string | null; email: string } | null;
}

interface InviteListProps {
  invites: Invite[];
  loading?: boolean;
  onRevoke?: (inviteId: string) => void;
  onResend?: (inviteId: string) => void;
}

export function InviteList({ invites, loading, onRevoke, onResend }: InviteListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Pending Invitations</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-40 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-16 rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Pending Invitations
          {invites.length > 0 && <span className="ml-2 text-sm font-normal text-text-muted">({invites.length})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invites.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Mail className="h-8 w-8 text-text-muted mb-2" />
            <p className="text-sm text-text-muted">No pending invitations</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invites.map((invite) => {
              const expired = new Date(invite.expiresAt) < new Date();
              return (
                <div key={invite.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-lg bg-muted p-2">
                      <Mail className="h-4 w-4 text-text-muted" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{invite.email}</p>
                      <p className="text-xs text-text-muted">
                        {invite.role} &middot; {new Date(invite.createdAt).toLocaleDateString()}
                        {invite.invitedBy && <> &middot; by {invite.invitedBy.fullName || invite.invitedBy.email}</>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={expired ? "destructive" : "outline"} className="text-xs">
                      {expired ? "Expired" : "Pending"}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => onResend?.(invite.id)} title="Resend">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onRevoke?.(invite.id)} title="Revoke">
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
