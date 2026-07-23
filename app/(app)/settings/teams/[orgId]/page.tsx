"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, Loader2, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { Separator } from "@/components/ui/separator";
import { MemberRow } from "@/components/organization/member-row";
import { InviteDialog } from "@/components/organization/invite-dialog";
import { ROLE_LABELS } from "@/lib/constants/roles";

interface Member {
  id: string;
  role: string;
  userId: string;
  joinedAt: string;
  user: { id: string; email: string; name: string; avatarUrl: string | null };
  invitedBy: { id: string; name: string } | null;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  invitedBy: { id: string; email: string; name: string };
  createdAt: string;
}

export default function OrganizationSettingsPage() {
  const params = useParams<{ orgId: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrg = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${params.orgId}`);
      if (!res.ok) throw new Error("Failed to load organization");
      const json = await res.json();
      setOrg(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }, [params.orgId]);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${params.orgId}/members`);
      if (res.ok) {
        const json = await res.json();
        setMembers(json.data);
      }
    } catch {}
  }, [params.orgId]);

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${params.orgId}/invitations`);
      if (res.ok) {
        const json = await res.json();
        setInvitations(json.data);
      }
    } catch {}
  }, [params.orgId]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchOrg(), fetchMembers(), fetchInvitations()]);
      setLoading(false);
    }
    void load();
  }, [fetchOrg, fetchMembers, fetchInvitations]);

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Are you sure you want to remove this member?")) return;
    setActionLoading(memberId);
    try {
      await fetch(`/api/organizations/${params.orgId}/members?memberId=${memberId}`, {
        method: "DELETE",
      });
      await fetchMembers();
    } catch {}
    setActionLoading(null);
  }

  async function handleRoleChange(memberId: string, role: string) {
    setActionLoading(memberId);
    try {
      await fetch(`/api/organizations/${params.orgId}/members?memberId=${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      await fetchMembers();
    } catch {}
    setActionLoading(null);
  }

  async function handleTransferOwnership(memberId: string) {
    if (!confirm("Are you sure you want to transfer ownership? This cannot be undone.")) return;
    setActionLoading(memberId);
    try {
      await fetch(`/api/organizations/${params.orgId}/members?memberId=${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "transfer-ownership" }),
      });
      await fetchOrg();
      await fetchMembers();
    } catch {}
    setActionLoading(null);
  }

  async function handleRevokeInvitation(invitationId: string) {
    setActionLoading(invitationId);
    try {
      await fetch(`/api/organizations/${params.orgId}/invitations?invitationId=${invitationId}`, {
        method: "DELETE",
      });
      await fetchInvitations();
    } catch {}
    setActionLoading(null);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="space-y-6">
        <PageHeader title="Team Settings" description="Manage your team workspace" />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Building2 className="h-12 w-12 text-gray-300" />
            <p className="text-gray-500">{error || "Organization not found"}</p>
            <Button variant="outline" onClick={() => router.push("/settings")}>
              Back to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canManage = org.myRole === "OWNER" || org.myRole === "ADMIN";
  const pendingInvitations = invitations.filter((i) => i.status === "PENDING");

  return (
    <div className="space-y-6">
      <PageHeader
        title={org.name}
        description="Manage your team workspace and members"
        action={
          <Button variant="ghost" onClick={() => router.push("/settings")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Button>
        }
      />

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">
            <Users className="mr-2 h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Building2 className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">
                Team Members ({members.length})
              </h3>
              <p className="text-sm text-gray-500">
                Invite and manage team members in this organization.
              </p>
            </div>
            {canManage && (
              <InviteDialog organizationId={params.orgId} onSuccess={fetchInvitations}>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              </InviteDialog>
            )}
          </div>

          <div className="space-y-2">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                currentUserRole={org.myRole}
                currentUserId={member.user.id}
                onRemove={handleRemoveMember}
                onRoleChange={handleRoleChange}
                onTransferOwnership={handleTransferOwnership}
              />
            ))}
          </div>

          {pendingInvitations.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-medium">
                  Pending Invitations ({pendingInvitations.length})
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  These invitations are waiting to be accepted.
                </p>
                <div className="mt-4 space-y-2">
                  {pendingInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{inv.email}</p>
                        <p className="text-xs text-gray-500">
                          {ROLE_LABELS[inv.role as keyof typeof ROLE_LABELS]} &middot;
                          Expires {new Date(inv.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleRevokeInvitation(inv.id)}
                        disabled={actionLoading === inv.id}
                      >
                        Revoke
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>
                View and manage your organization details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-sm text-gray-900">{org.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Slug</label>
                <p className="text-sm text-gray-900">{org.slug}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Members</label>
                <p className="text-sm text-gray-900">{org._count?.members ?? 0}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Brand Kits</label>
                <p className="text-sm text-gray-900">{org._count?.brandKits ?? 0}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Templates</label>
                <p className="text-sm text-gray-900">{org._count?.templates ?? 0}</p>
              </div>
              {org.myRole === "OWNER" && (
                <p className="text-xs text-amber-600">
                  As the owner, you can delete this organization. This action cannot be undone.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
