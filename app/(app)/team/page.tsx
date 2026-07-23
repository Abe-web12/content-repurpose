"use client";

import { useSearchParams } from "next/navigation";
import { Users, UserPlus, Activity, Shield, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/billing/stat-card";
import { TeamSidebar } from "@/components/team/team-sidebar";
import { ActivityFeed } from "@/components/team/activity-feed";
import { useOrganization, useTeamActivity } from "@/hooks/use-organization";

export default function TeamOverviewPage() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId") || "default";
  const { data, loading } = useOrganization(orgId);
  const { logs, loading: logsLoading } = useTeamActivity(orgId);

  const org = data?.org;
  const members = data?.members || [];
  const role = data?.role;
  const activeMembers = members.filter((m) => !m.isSuspended);

  return (
    <div className="space-y-8">
      <PageHeader
        title={org?.name || "Team"}
        description="Manage your organization and team members"
      />

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <TeamSidebar orgId={orgId} currentRole={role} />

        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Members"
              value={loading ? "..." : activeMembers.length}
              subtitle={`${org?.maxSeats || "?"} max seats`}
              icon={Users}
              loading={loading}
            />
            <StatCard
              title="Plan"
              value={loading ? "..." : (org?.plan || "free")}
              subtitle={org?.plan === "free" ? "Upgrade for more" : ""}
              icon={Shield}
              loading={loading}
            />
            <StatCard
              title="Role"
              value={loading ? "..." : (role || "-")}
              subtitle="Your access level"
              icon={Settings}
              loading={loading}
            />
            <StatCard
              title="Pending Invites"
              value={loading ? "..." : "0"}
              icon={UserPlus}
              loading={loading}
            />
          </div>

          <ActivityFeed logs={logs} loading={logsLoading} />
        </div>
      </div>
    </div>
  );
}
