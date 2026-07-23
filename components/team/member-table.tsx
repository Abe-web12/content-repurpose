"use client";

import { useState } from "react";
import { Shield, MoreHorizontal, UserX, UserCheck, Crown, ArrowUpRight, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Member {
  id: string;
  role: string;
  userId: string;
  isSuspended: boolean;
  joinedAt: string;
  user: { id: string; email: string; fullName: string | null; avatarUrl: string | null; plan: string };
  invitedBy: { id: string; fullName: string | null; email: string } | null;
}

interface MemberTableProps {
  members: Member[];
  loading?: boolean;
  currentUserId?: string;
  currentRole?: string;
  onRemove?: (userId: string) => void;
  onChangeRole?: (userId: string, role: string) => void;
  onSuspend?: (userId: string) => void;
  onUnsuspend?: (userId: string) => void;
  onTransferOwnership?: (userId: string) => void;
}

const roleColors: Record<string, string> = {
  OWNER: "bg-yellow-100 text-yellow-800 border-yellow-300",
  ADMIN: "bg-red-100 text-red-800 border-red-300",
  MANAGER: "bg-purple-100 text-purple-800 border-purple-300",
  EDITOR: "bg-blue-100 text-blue-800 border-blue-300",
  VIEWER: "bg-gray-100 text-gray-800 border-gray-300",
};

function MemberRow({ member, currentUserId, currentRole, onRemove, onChangeRole, onSuspend, onUnsuspend, onTransferOwnership }: {
  member: Member;
  currentUserId?: string;
  currentRole?: string;
  onRemove?: (userId: string) => void;
  onChangeRole?: (userId: string, role: string) => void;
  onSuspend?: (userId: string) => void;
  onUnsuspend?: (userId: string) => void;
  onTransferOwnership?: (userId: string) => void;
}) {
  const isSelf = member.userId === currentUserId;
  const isOwner = member.role === "OWNER";
  const canManage = currentRole === "OWNER" || currentRole === "ADMIN";

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
          <span className="text-sm font-semibold text-brand-700">
            {(member.user.fullName || member.user.email).charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-text-primary truncate">
              {member.user.fullName || member.user.email.split("@")[0]}
              {isSelf && <span className="ml-1.5 text-xs text-text-muted">(you)</span>}
            </p>
            {isOwner && <Crown className="h-3.5 w-3.5 text-yellow-500" />}
          </div>
          <p className="text-xs text-text-muted truncate">{member.user.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className={`${roleColors[member.role] || ""} text-xs`}>
          {member.role}
        </Badge>

        {canManage && !isSelf && !isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {currentRole === "OWNER" && (
                <>
                  <DropdownMenuItem onClick={() => onChangeRole?.(member.userId, "ADMIN")}>
                    <Shield className="h-4 w-4 mr-2" /> Make Admin
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onChangeRole?.(member.userId, "MANAGER")}>
                    <Shield className="h-4 w-4 mr-2" /> Make Manager
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onChangeRole?.(member.userId, "EDITOR")}>
                    <Shield className="h-4 w-4 mr-2" /> Make Editor
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onChangeRole?.(member.userId, "VIEWER")}>
                    <Shield className="h-4 w-4 mr-2" /> Make Viewer
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onTransferOwnership?.(member.userId)}>
                    <Crown className="h-4 w-4 mr-2" /> Transfer Ownership
                  </DropdownMenuItem>
                </>
              )}
              {(currentRole === "OWNER" || currentRole === "ADMIN") && (
                <>
                  {member.isSuspended ? (
                    <DropdownMenuItem onClick={() => onUnsuspend?.(member.userId)}>
                      <UserCheck className="h-4 w-4 mr-2" /> Unsuspend
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => onSuspend?.(member.userId)}>
                      <UserX className="h-4 w-4 mr-2" /> Suspend
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onRemove?.(member.userId)} className="text-red-600">
                    <UserX className="h-4 w-4 mr-2" /> Remove
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

export function MemberTable({ members, loading, currentUserId, currentRole, ...actions }: MemberTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Team Members</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Team Members ({members.length})</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Users className="h-8 w-8 text-text-muted mb-2" />
            <p className="text-sm text-text-muted">No members yet</p>
          </div>
        ) : (
          members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              currentUserId={currentUserId}
              currentRole={currentRole}
              {...actions}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
