"use client";

import { useState } from "react";
import {
  Crown,
  MoreHorizontal,
  UserMinus,
  UserCog,
  Shield,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { ROLE_LABELS, type Role } from "@/lib/constants/roles";

interface Member {
  id: string;
  role: string;
  userId: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
  invitedBy: { id: string; name: string } | null;
  joinedAt: string;
}

interface MemberRowProps {
  member: Member;
  currentUserRole: string;
  currentUserId: string;
  onRemove: (memberId: string) => void;
  onRoleChange: (memberId: string, role: string) => void;
  onTransferOwnership: (memberId: string) => void;
}

export function MemberRow({
  member,
  currentUserRole,
  currentUserId,
  onRemove,
  onRoleChange,
  onTransferOwnership,
}: MemberRowProps) {
  const isOwner = member.role === "OWNER";
  const isSelf = member.userId === currentUserId;
  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.user.avatarUrl ?? ""} alt="" />
          <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{member.user.name}</p>
            {isOwner && (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                <Crown className="mr-1 h-3 w-3" />
                Owner
              </Badge>
            )}
            {isSelf && (
              <Badge variant="secondary" className="text-xs">You</Badge>
            )}
          </div>
          <p className="text-sm text-gray-500">{member.user.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isOwner ? (
          <span className="text-sm font-medium text-amber-600">{ROLE_LABELS[member.role as Role]}</span>
        ) : canManage && !isSelf ? (
          <Select
            value={member.role}
            onValueChange={(v) => onRoleChange(member.id, v)}
          >
            <SelectTrigger className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">{ROLE_LABELS.ADMIN}</SelectItem>
              <SelectItem value="EDITOR">{ROLE_LABELS.EDITOR}</SelectItem>
              <SelectItem value="VIEWER">{ROLE_LABELS.VIEWER}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-gray-600">{ROLE_LABELS[member.role as Role]}</span>
        )}

        {(canManage || isOwner) && !isSelf && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {currentUserRole === "OWNER" && (
                <DropdownMenuItem onClick={() => onTransferOwnership(member.id)}>
                  <Shield className="mr-2 h-4 w-4" />
                  Transfer Ownership
                </DropdownMenuItem>
              )}
              {!isOwner && (
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => onRemove(member.id)}
                >
                  <UserMinus className="mr-2 h-4 w-4" />
                  Remove Member
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
