"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User, CreditCard, Bell, Key, Palette, Building2, LogOut, ExternalLink, Loader2,
  Shield, ChevronRight, Plus,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlanBadge } from "@/components/billing/plan-badge";
import { useUser } from "@/hooks/use-user";
import { showError, showSuccess } from "@/components/ui/toast";
import { BrandKitForm } from "@/components/settings/brand-kit-form";
import { WebhookSettings } from "@/components/settings/WebhookSettings";
import { BillingOverview } from "@/components/billing/billing-overview";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { useUsage } from "@/components/providers/usage-provider";
import { useWorkspace } from "@/components/providers/workspace-provider";

export default function SettingsPage() {
  const { profile, loading: profileLoading, signOut } = useUser();
  const { plan, generationsUsed, generationsLimit } = useUsage();
  const { workspaces } = useWorkspace();
  const [portalLoading, setPortalLoading] = useState(false);
  const [tab, setTab] = useState("profile");

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        showError(json.error || "Failed to open billing portal");
        return;
      }
      if (json.url) window.location.href = json.url;
    } catch {
      showError("Something went wrong");
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader title="Settings" description="Manage your account, plan, and preferences." />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full flex-wrap">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="brand" className="gap-2">
            <Palette className="h-4 w-4" />
            Brand Kit
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Key className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="teams" className="gap-2">
            <Building2 className="h-4 w-4" />
            Teams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-text-muted" />
                <div>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Your account details.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-xs font-medium text-text-muted">Email</span>
                  <p className="text-sm text-text-primary">{profile?.email || "-"}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-text-muted">Name</span>
                  <p className="text-sm text-text-primary">{profile?.full_name || "-"}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-text-muted">Plan</span>
                  <div className="mt-0.5">
                    <PlanBadge />
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-text-muted">Generations Used</span>
                  <p className="text-sm text-text-primary">
                    {profile?.generations_used ?? 0} / {profile?.generations_limit ?? 3}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-text-muted" />
                <div>
                  <CardTitle>Password & Security</CardTitle>
                  <CardDescription>Manage your password.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild>
                <a href="/forgot-password">Reset password</a>
              </Button>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex items-center justify-between rounded-lg border border-surface-2 p-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Sign out</p>
              <p className="text-xs text-text-muted">Sign out of your account on this device.</p>
            </div>
            <Button variant="outline" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="billing" className="mt-6 space-y-6">
          <BillingOverview
            plan={plan}
            generationsUsed={generationsUsed}
            generationsLimit={generationsLimit}
          />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationCenter />
        </TabsContent>

        <TabsContent value="brand" className="mt-6">
          <BrandKitForm />
        </TabsContent>

        <TabsContent value="integrations" className="mt-6 space-y-6">
          <WebhookSettings />
        </TabsContent>

        <TabsContent value="teams" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-text-muted" />
                <div>
                  <CardTitle>Team Workspaces</CardTitle>
                  <CardDescription>Manage your organization workspaces and team members.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {workspaces.filter((w) => w.id !== "personal").length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Building2 className="h-12 w-12 text-gray-300" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-text-primary">No team workspaces yet</p>
                    <p className="text-xs text-text-muted">
                      Create a workspace to collaborate with your team.
                    </p>
                  </div>
                  <Button asChild>
                    <Link href="/settings/teams/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Team
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {workspaces
                    .filter((w) => w.id !== "personal")
                    .map((ws) => (
                      <Link
                        key={ws.id}
                        href={`/settings/teams/${ws.id}`}
                        className="flex items-center justify-between py-3 transition-colors hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-primary">{ws.name}</p>
                            <p className="text-xs text-text-muted capitalize">{ws.role.toLowerCase()}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </Link>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button variant="outline" asChild>
              <Link href="/settings/teams/new">
                <Plus className="mr-2 h-4 w-4" />
                Create New Team
              </Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
