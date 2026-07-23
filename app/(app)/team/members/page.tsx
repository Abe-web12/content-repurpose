"use client";

import { useSearchParams } from "next/navigation";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { TeamSidebar } from "@/components/team/team-sidebar";
import { MemberTable } from "@/components/team/member-table";
import { useOrganization, useTeamMembers, useMemberActions } from "@/hooks/use-organization";

export default function TeamMembersPage() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId") || "default";
  const { data } = useOrganization(orgId);
  const { members, loading, refetch } = useTeamMembers(orgId);
  const { changeRole, removeMember, suspendMember, unsuspendMember, transferOwnership } = useMemberActions();

  const currentUserId = data?.members.find((m) => m.user.email)?.userId;
  const currentRole = data?.role;

  const handleAction = async (fn: Function, ...args: any[]) => {
    await fn(...args);
    refetch();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team Members"
        description="Manage who has access to your organization"
      />

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <TeamSidebar orgId={orgId} currentRole={currentRole} />

        <MemberTable
          members={members}
          loading={loading}
          currentUserId={currentUserId}
          currentRole={currentRole}
          onRemove={(uid) => handleAction(removeMember, orgId, uid)}
          onChangeRole={(uid, role) => handleAction(changeRole, orgId, uid, role)}
          onSuspend={(uid) => handleAction(suspendMember, orgId, uid)}
          onUnsuspend={(uid) => handleAction(unsuspendMember, orgId, uid)}
          onTransferOwnership={(uid) => handleAction(transferOwnership, orgId, uid)}
        />
      </div>
    </div>
  );
}
