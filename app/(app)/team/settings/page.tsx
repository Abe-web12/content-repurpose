"use client";

import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { TeamSidebar } from "@/components/team/team-sidebar";
import { OrgSettingsForm } from "@/components/team/org-settings-form";
import { useInviteActions } from "@/hooks/use-organization";

export default function TeamSettingsPage() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId") || "default";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage organization settings"
      />

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <TeamSidebar orgId={orgId} />

        <OrgSettingsForm
          org={{ id: orgId, name: "Organization", slug: "org", logo: null, timezone: "UTC", brandColor: null, domain: null, maxSeats: 5 }}
          onSave={async () => {}}
        />
      </div>
    </div>
  );
}
