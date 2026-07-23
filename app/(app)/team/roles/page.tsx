"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Shield, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { TeamSidebar } from "@/components/team/team-sidebar";
import { useOrganization } from "@/hooks/use-organization";

interface RoleInfo {
  name: string;
  permissions: string[];
  level: number;
}

export default function TeamRolesPage() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId") || "default";
  const { data } = useOrganization(orgId);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const currentRole = data?.role;

  useEffect(() => {
    window.fetch("/api/team/roles")
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json.data)) setRoles(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Roles & Permissions"
        description="View role-based access levels"
      />

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <TeamSidebar orgId={orgId} currentRole={currentRole} />

        <div className="grid gap-6 sm:grid-cols-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardHeader><Skeleton className="h-5 w-24" /><Skeleton className="h-3 w-32" /></CardHeader>
                <CardContent className="space-y-2">
                  {Array.from({ length: 4 }).map((_, j) => <Skeleton key={j} className="h-4 w-full" />)}
                </CardContent>
              </Card>
            ))
          ) : (
            roles.map((role) => (
              <Card key={role.name} className={currentRole === role.name ? "ring-2 ring-brand-500" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {role.name.charAt(0) + role.name.slice(1).toLowerCase()}
                    </CardTitle>
                    <Badge variant="outline">Level {role.level}</Badge>
                  </div>
                  <CardDescription>
                    {role.permissions.length} permissions
                    {currentRole === role.name && <span className="ml-2 text-brand-600 font-medium">(your role)</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {role.permissions.slice(0, 10).map((perm) => (
                      <div key={perm} className="flex items-center gap-2 text-sm">
                        <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        <span className="text-text-primary">{perm}</span>
                      </div>
                    ))}
                    {role.permissions.length > 10 && (
                      <p className="text-xs text-text-muted pt-1">+{role.permissions.length - 10} more permissions</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
