"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SSOSettings } from "@/components/security/sso-settings";
import { MFASetup } from "@/components/security/mfa-setup";
import { SessionManager } from "@/components/security/session-manager";
import { AuditLogViewer } from "@/components/security/audit-log-viewer";
import { APIKeyManager } from "@/components/security/api-key-manager";
import { SecurityPolicyEditor } from "@/components/security/security-policy-editor";
import { ThreatMonitor } from "@/components/security/threat-monitor";
import { ComplianceCenter } from "@/components/security/compliance-center";

interface SecurityDashboardProps {
  orgId?: string;
}

export function SecurityDashboard({ orgId }: SecurityDashboardProps) {
  const [tab, setTab] = useState("overview");

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sso">SSO</TabsTrigger>
          <TabsTrigger value="mfa">MFA</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="threats">Threats</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ThreatMonitor orgId={orgId} />
            <SessionManager />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <MFASetup />
            {orgId && <SecurityPolicyEditor orgId={orgId} />}
          </div>
        </TabsContent>

        <TabsContent value="sso" className="mt-6">
          {orgId ? <SSOSettings orgId={orgId} /> : <p className="text-sm text-gray-500">SSO requires an organization</p>}
        </TabsContent>

        <TabsContent value="mfa" className="mt-6">
          <MFASetup />
        </TabsContent>

        <TabsContent value="sessions" className="mt-6">
          <SessionManager />
        </TabsContent>

        <TabsContent value="api-keys" className="mt-6">
          {orgId ? <APIKeyManager orgId={orgId} /> : <p className="text-sm text-gray-500">API keys require an organization</p>}
        </TabsContent>

        <TabsContent value="policies" className="mt-6">
          {orgId ? <SecurityPolicyEditor orgId={orgId} /> : <p className="text-sm text-gray-500">Policies require an organization</p>}
        </TabsContent>

        <TabsContent value="threats" className="mt-6">
          <ThreatMonitor orgId={orgId} />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditLogViewer orgId={orgId} />
        </TabsContent>

        <TabsContent value="compliance" className="mt-6">
          <ComplianceCenter />
        </TabsContent>
      </Tabs>
    </div>
  );
}
