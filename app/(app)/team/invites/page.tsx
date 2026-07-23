"use client";

import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { TeamSidebar } from "@/components/team/team-sidebar";
import { InviteForm } from "@/components/team/invite-form";
import { InviteList } from "@/components/team/invite-list";
import { useOrganization, useTeamInvites, useInviteActions } from "@/hooks/use-organization";

export default function TeamInvitesPage() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId") || "default";
  const { data } = useOrganization(orgId);
  const { invites, loading, refetch } = useTeamInvites(orgId);
  const { createInvite, revokeInvite, resendInvite } = useInviteActions();

  const currentRole = data?.role;

  const handleInvite = async (email: string, role: string) => {
    await createInvite(orgId, email, role);
    refetch();
  };

  const handleRevoke = async (inviteId: string) => {
    await revokeInvite(orgId, inviteId);
    refetch();
  };

  const handleResend = async (inviteId: string) => {
    await resendInvite(orgId, inviteId);
    refetch();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Invitations"
        description="Send and manage team invitations"
      />

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <TeamSidebar orgId={orgId} currentRole={currentRole} />

        <div className="space-y-6">
          <InviteForm onInvite={handleInvite} />
          <InviteList
            invites={invites}
            loading={loading}
            onRevoke={handleRevoke}
            onResend={handleResend}
          />
        </div>
      </div>
    </div>
  );
}
